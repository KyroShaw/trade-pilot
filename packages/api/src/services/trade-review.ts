import { db } from "@trade-pilot/db";
import { tradeReviews } from "@trade-pilot/db/schema/reviews";
import { tradeOrders } from "@trade-pilot/db/schema/trading";
import type { LLMConfig } from "@trade-pilot/llm";
import { callLLM } from "@trade-pilot/llm";
import { eq } from "drizzle-orm";

function formatDuration(ms: number): string {
	const hours = Math.floor(ms / 3_600_000);
	if (hours < 24) {
		return `${hours}小时`;
	}
	return `${Math.floor(hours / 24)}天`;
}

function buildBasicPrompt(order: typeof tradeOrders.$inferSelect): string {
	const entryPrice = order.executedPrice ?? "unknown";
	const qty = order.executedQty ?? "unknown";
	const pnl = order.pnl ? `${Number(order.pnl).toFixed(4)} USDT` : "未平仓";
	const duration = order.closedAt
		? formatDuration(
				new Date(order.closedAt).getTime() -
					new Date(order.createdAt ?? Date.now()).getTime()
			)
		: "持仓中";

	return `你是一个专业的加密货币交易复盘助手。请对以下交易进行简洁的复盘分析（200字以内，用中文回答）：
- 交易对: ${order.symbol}
- 方向: ${order.side === "BUY" ? "买入" : "卖出"}
- 成交价: ${entryPrice}，数量: ${qty}
- 持仓时长: ${duration}
- 盈亏: ${pnl}

请提供：1) 时机判断是否合理，2) 1-2个具体可执行的改进建议。语气克制，避免空泛。`;
}

function buildDiagnosisPrompt(
	order: typeof tradeOrders.$inferSelect,
	openReason: string,
	closeReason: string
): string {
	const basicPrompt = buildBasicPrompt(order);
	return `${basicPrompt}

额外信息：
- 用户开仓理由: ${openReason}
- 用户平仓理由: ${closeReason}

请额外指出：用户的判断哪里对了、哪里错了、下次如何改进（结合用户自述逻辑，具体诊断，避免泛泛而谈）。`;
}

export async function generateBasicReview(
	orderId: string,
	userId: string,
	llmConfig: LLMConfig | null
): Promise<void> {
	if (!llmConfig) {
		return;
	}

	const [order] = await db
		.select()
		.from(tradeOrders)
		.where(eq(tradeOrders.id, orderId))
		.limit(1);

	if (!order) {
		return;
	}

	const prompt = buildBasicPrompt(order);
	const basicReview = await callLLM(llmConfig, prompt);

	await db
		.insert(tradeReviews)
		.values({
			orderId,
			userId,
			basicReview,
			basicGeneratedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: tradeReviews.orderId,
			set: { basicReview, basicGeneratedAt: new Date() },
		});
}

export async function generateDiagnosisReview(
	orderId: string,
	openReason: string,
	closeReason: string,
	llmConfig: LLMConfig | null
): Promise<void> {
	if (!llmConfig) {
		return;
	}

	const [order] = await db
		.select()
		.from(tradeOrders)
		.where(eq(tradeOrders.id, orderId))
		.limit(1);

	if (!order) {
		return;
	}

	const prompt = buildDiagnosisPrompt(order, openReason, closeReason);
	const diagnosisReview = await callLLM(llmConfig, prompt);

	await db
		.insert(tradeReviews)
		.values({
			orderId,
			userId: order.userId,
			diagnosisReview,
			diagnosisGeneratedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: tradeReviews.orderId,
			set: { diagnosisReview, diagnosisGeneratedAt: new Date() },
		});
}
