import { db } from "@trade-pilot/db";
import {
	alphaKlineCache,
	alphaProjects,
	alphaSignals,
} from "@trade-pilot/db/schema/alpha";
import type { LLMConfig } from "@trade-pilot/llm";
import { callLLM } from "@trade-pilot/llm";
import { and, eq } from "drizzle-orm";

import { fetchKlines } from "./binance-market";
import {
	detectConsolidation,
	getAlphaSignalPrompt,
} from "./consolidation-strategy";

async function collectAndCacheKlines(
	projectId: string,
	binancePair: string
): Promise<void> {
	const klines = await fetchKlines(binancePair);
	for (const kline of klines) {
		const dateStr = new Date(kline.openTime).toISOString().slice(0, 10);
		await db
			.insert(alphaKlineCache)
			.values({
				projectId,
				date: dateStr,
				open: kline.open,
				high: kline.high,
				low: kline.low,
				close: kline.close,
				volume: kline.volume,
			})
			.onConflictDoUpdate({
				target: [alphaKlineCache.projectId, alphaKlineCache.date],
				set: {
					open: kline.open,
					high: kline.high,
					low: kline.low,
					close: kline.close,
					volume: kline.volume,
				},
			});
	}
}

export async function runAlphaScan(llmConfig: LLMConfig | null): Promise<void> {
	const projects = await db
		.select()
		.from(alphaProjects)
		.where(eq(alphaProjects.isActive, true));

	for (const project of projects) {
		let klines: (typeof alphaKlineCache.$inferSelect)[] = [];
		try {
			await collectAndCacheKlines(project.id, project.binancePair);
			klines = await db
				.select()
				.from(alphaKlineCache)
				.where(eq(alphaKlineCache.projectId, project.id))
				.orderBy(alphaKlineCache.date);
		} catch (err) {
			console.error(
				`[alpha-scan] failed to collect ${project.binancePair}:`,
				err
			);
			// Stagger calls to respect Binance rate limits
			await new Promise((resolve) => setTimeout(resolve, 100));
			continue;
		}

		const result = detectConsolidation(
			klines.map((k) => ({
				openTime: new Date(k.date).getTime(),
				open: k.open,
				high: k.high,
				low: k.low,
				close: k.close,
				volume: k.volume,
				closeTime: new Date(k.date).getTime(),
			}))
		);

		// Mark all prior signals for this project as inactive
		await db
			.update(alphaSignals)
			.set({ isActive: false })
			.where(
				and(
					eq(alphaSignals.projectId, project.id),
					eq(alphaSignals.isActive, true)
				)
			);

		if (result.qualified) {
			let aiReason: string | null = null;
			if (llmConfig) {
				aiReason = await callLLM(
					llmConfig,
					getAlphaSignalPrompt(project.name, result)
				).catch(() => null);
			}

			await db.insert(alphaSignals).values({
				projectId: project.id,
				consolidationDays: result.consolidationDays,
				drawdownFromAth: String(result.drawdownFromAth),
				pricePercentile: String(result.pricePercentile),
				atrRatio: String(result.atrRatio),
				aiReason,
				generatedAt: new Date(),
				isActive: true,
			});
		}

		// Stagger calls to respect Binance rate limits
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}
