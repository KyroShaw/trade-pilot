import { db } from "@trade-pilot/db";
import { aiAlerts } from "@trade-pilot/db/schema/profit-curve";
import type { LLMConfig } from "@trade-pilot/llm";
import { callLLM } from "@trade-pilot/llm";
import { and, eq, gte } from "drizzle-orm";

import { getUserMetrics } from "./capital-metrics";

const CONSECUTIVE_THRESHOLD = 3;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_DRAWDOWN_THRESHOLD = 0.2;

async function hasRecentAlert(userId: string, type: string): Promise<boolean> {
	const cutoff = new Date(Date.now() - COOLDOWN_MS);
	const [recent] = await db
		.select({ id: aiAlerts.id })
		.from(aiAlerts)
		.where(
			and(
				eq(aiAlerts.userId, userId),
				eq(aiAlerts.type, type),
				gte(aiAlerts.generatedAt, cutoff)
			)
		)
		.limit(1);
	return !!recent;
}

async function createAlert(
	userId: string,
	type: string,
	content: string,
	triggerContext: Record<string, unknown>
): Promise<void> {
	await db.insert(aiAlerts).values({
		userId,
		type,
		content,
		triggerContext,
		generatedAt: new Date(),
	});
}

function buildConsecutiveLossPrompt(n: number, totalPnl: number): string {
	return `你是一个交易风险管理助手，语气克制、冷静。
用户最近连续亏损 ${n} 笔交易，近期亏损合计 ${totalPnl.toFixed(2)} USDT。
请提供：1) 客观的近期交易统计总结，2) 连续亏损对心理的潜在影响提示，3) 1-2条行动建议（如暂停交易、回顾策略）。
不要做市场预测，不要给出任何买卖建议。结尾加：「以上为风险提示，不构成投资建议。」`;
}

function buildConsecutiveWinPrompt(n: number, totalPnl: number): string {
	return `你是一个交易风险管理助手，语气克制、冷静。
用户最近连续盈利 ${n} 笔交易，近期盈利合计 ${totalPnl.toFixed(2)} USDT。
请提供：1) 客观的近期交易统计总结，2) 连续盈利可能带来的过度自信风险提示，3) 1-2条行动建议（如保持规则、避免仓位过重）。
不要做市场预测，不要给出任何买卖建议。结尾加：「以上为风险提示，不构成投资建议。」`;
}

function buildWeeklyRiskPrompt(drawdownPct: number): string {
	return `你是一个交易风险管理助手，语气克制、冷静。
用户本周最大回撤达到 ${(drawdownPct * 100).toFixed(1)}%，超过 20% 风险警戒线。
请提供：1) 回撤原因可能的方向（不要给出具体判断），2) 高回撤期间的资金管理建议，3) 如何制定止损规则。
不要做市场预测，不要给出任何买卖建议。结尾加：「以上为风险提示，不构成投资建议。」`;
}

export async function checkAndTriggerAlerts(
	userId: string,
	llmConfig: LLMConfig | null
): Promise<void> {
	if (!llmConfig) {
		return;
	}

	const metrics = await getUserMetrics(userId);

	if (metrics.consecutiveLosses >= CONSECUTIVE_THRESHOLD) {
		const alreadyAlerted = await hasRecentAlert(userId, "consecutive_loss");
		if (!alreadyAlerted) {
			const prompt = buildConsecutiveLossPrompt(
				metrics.consecutiveLosses,
				metrics.totalPnl
			);
			const content = await callLLM(llmConfig, prompt);
			if (content) {
				await createAlert(userId, "consecutive_loss", content, {
					consecutiveCount: metrics.consecutiveLosses,
					recentPnl: metrics.totalPnl,
				});
			}
		}
	}

	if (metrics.consecutiveWins >= CONSECUTIVE_THRESHOLD) {
		const alreadyAlerted = await hasRecentAlert(userId, "consecutive_win");
		if (!alreadyAlerted) {
			const prompt = buildConsecutiveWinPrompt(
				metrics.consecutiveWins,
				metrics.totalPnl
			);
			const content = await callLLM(llmConfig, prompt);
			if (content) {
				await createAlert(userId, "consecutive_win", content, {
					consecutiveCount: metrics.consecutiveWins,
					recentPnl: metrics.totalPnl,
				});
			}
		}
	}
}

export async function checkWeeklyRisk(
	userId: string,
	llmConfig: LLMConfig | null
): Promise<void> {
	if (!llmConfig) {
		return;
	}

	const metrics = await getUserMetrics(userId);
	const drawdownPct = metrics.drawdown.maxDrawdownPct;

	if (drawdownPct <= MAX_DRAWDOWN_THRESHOLD) {
		return;
	}

	const alreadyAlerted = await hasRecentAlert(userId, "weekly_risk");
	if (alreadyAlerted) {
		return;
	}

	const prompt = buildWeeklyRiskPrompt(drawdownPct);
	const content = await callLLM(llmConfig, prompt);
	if (content) {
		await createAlert(userId, "weekly_risk", content, {
			drawdownPct,
			peakDate: metrics.drawdown.peakDate,
			troughDate: metrics.drawdown.troughDate,
		});
	}
}

export async function checkAndFetchOrders(
	userId: string
): Promise<{ consecutiveLosses: number; consecutiveWins: number }> {
	const metrics = await getUserMetrics(userId);
	return {
		consecutiveLosses: metrics.consecutiveLosses,
		consecutiveWins: metrics.consecutiveWins,
	};
}
