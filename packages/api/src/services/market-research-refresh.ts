import { db } from "@trade-pilot/db";
import { newsCache, sectorCache } from "@trade-pilot/db/schema/market-research";
import type { LLMConfig } from "@trade-pilot/llm";
import { callLLM } from "@trade-pilot/llm";
import { eq } from "drizzle-orm";

import { fetchCategories, fetchCategoryTokens, fetchNews } from "./coingecko";

function getSectorSummaryPrompt(
	sectors: Array<{ name: string; change: number }>
): string {
	const list = sectors
		.slice(0, 3)
		.map((s, i) => `${i + 1}. ${s.name}（24h 变化：${s.change.toFixed(2)}%）`)
		.join("\n");
	return `你是一名加密货币市场分析师，请对以下当前最热门的3个板块做简洁的综合研判（100字以内）：\n${list}\n请说明：为什么这些板块正在走热，热度是否有持续性。不要做价格预测，不要给出投资建议。`;
}

function getNewsInterpretationPrompt(title: string): string {
	return `你是一名加密货币市场分析师。请对以下新闻标题做一句话影响解读（30字以内）：\n"${title}"\n请说明这条消息为什么重要，可能影响哪个方向。不做价格预测，不给投资建议。`;
}

export async function refreshSectors(
	llmConfig: LLMConfig | null
): Promise<void> {
	const categories = await fetchCategories();
	const sorted = [...categories]
		.filter((c) => c.market_cap_change_24h !== null)
		.sort(
			(a, b) => (b.market_cap_change_24h ?? 0) - (a.market_cap_change_24h ?? 0)
		)
		.slice(0, 10);

	let aiSummary: string | null = null;
	if (llmConfig) {
		const prompt = getSectorSummaryPrompt(
			sorted.map((c) => ({
				name: c.name,
				change: c.market_cap_change_24h ?? 0,
			}))
		);
		aiSummary = await callLLM(llmConfig, prompt).catch(() => null);
	}

	for (const category of sorted) {
		let topTokens: Array<{
			symbol: string;
			name: string;
			priceChange24h: number;
			volume: number;
		}> = [];
		try {
			const tokens = await fetchCategoryTokens(category.id);
			topTokens = tokens.map((t) => ({
				symbol: t.symbol.toUpperCase(),
				name: t.name,
				priceChange24h: t.price_change_percentage_24h ?? 0,
				volume: t.total_volume,
			}));
		} catch {
			// CoinGecko rate limit or error — skip this category's tokens
		}

		await db
			.insert(sectorCache)
			.values({
				categoryId: category.id,
				name: category.name,
				marketCapChange24h: String(category.market_cap_change_24h ?? 0),
				topTokens,
				aiSummary: sorted.indexOf(category) < 3 ? aiSummary : null,
				refreshedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: sectorCache.categoryId,
				set: {
					name: category.name,
					marketCapChange24h: String(category.market_cap_change_24h ?? 0),
					topTokens,
					aiSummary: sorted.indexOf(category) < 3 ? aiSummary : null,
					refreshedAt: new Date(),
				},
			});

		// Stagger requests to stay within CoinGecko free tier rate limits
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
}

export async function refreshNews(llmConfig: LLMConfig | null): Promise<void> {
	const articles = await fetchNews();
	const recent = articles.slice(0, 20);

	for (const article of recent) {
		let aiInterpretation: string | null = null;
		if (llmConfig) {
			aiInterpretation = await callLLM(
				llmConfig,
				getNewsInterpretationPrompt(article.title),
				{
					timeoutMs: 8000,
				}
			).catch(() => null);
		}

		await db
			.insert(newsCache)
			.values({
				externalId: article.id,
				title: article.title,
				url: article.url,
				source: article.author,
				publishedAt: article.published_at
					? new Date(article.published_at)
					: null,
				aiInterpretation,
				cachedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: newsCache.externalId,
				set: {
					title: article.title,
					aiInterpretation,
					cachedAt: new Date(),
				},
			});
	}

	// Remove stale entries beyond 20 most recent
	const allNews = await db
		.select({ id: newsCache.id, externalId: newsCache.externalId })
		.from(newsCache);
	const recentIds = new Set(recent.map((a) => a.id));
	for (const row of allNews) {
		if (!recentIds.has(row.externalId)) {
			await db.delete(newsCache).where(eq(newsCache.id, row.id));
		}
	}
}
