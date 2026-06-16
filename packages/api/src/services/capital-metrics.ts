import { db } from "@trade-pilot/db";
import { capitalSnapshots } from "@trade-pilot/db/schema/profit-curve";
import { tradeOrders } from "@trade-pilot/db/schema/trading";
import { and, asc, desc, eq } from "drizzle-orm";

export interface DrawdownResult {
	maxDrawdownPct: number;
	peakDate: string;
	troughDate: string;
}

export interface MetricsResult {
	consecutiveLosses: number;
	consecutiveWins: number;
	drawdown: DrawdownResult;
	totalPnl: number;
}

export function calcMaxDrawdown(
	snapshots: { date: string; usdtBalance: string }[]
): DrawdownResult {
	if (snapshots.length === 0) {
		return { maxDrawdownPct: 0, peakDate: "", troughDate: "" };
	}

	let peak = 0;
	let peakDate = "";
	let maxDrawdownPct = 0;
	let troughDate = "";

	for (const snap of snapshots) {
		const balance = Number(snap.usdtBalance);
		if (balance > peak) {
			peak = balance;
			peakDate = snap.date;
		}
		if (peak > 0) {
			const drawdown = (peak - balance) / peak;
			if (drawdown > maxDrawdownPct) {
				maxDrawdownPct = drawdown;
				troughDate = snap.date;
			}
		}
	}

	return { maxDrawdownPct, peakDate, troughDate };
}

export function calcConsecutiveStreak(
	orders: { pnl: string | null; side: string }[]
): { consecutiveLosses: number; consecutiveWins: number } {
	let consecutiveWins = 0;
	let consecutiveLosses = 0;

	for (const order of [...orders].reverse()) {
		if (order.side !== "BUY" || order.pnl === null) {
			break;
		}
		const pnl = Number(order.pnl);
		if (pnl > 0) {
			if (consecutiveLosses > 0) {
				break;
			}
			consecutiveWins++;
		} else if (pnl < 0) {
			if (consecutiveWins > 0) {
				break;
			}
			consecutiveLosses++;
		} else {
			break;
		}
	}

	return { consecutiveWins, consecutiveLosses };
}

export async function getUserMetrics(userId: string): Promise<MetricsResult> {
	const snapshots = await db
		.select()
		.from(capitalSnapshots)
		.where(eq(capitalSnapshots.userId, userId))
		.orderBy(asc(capitalSnapshots.date));

	const orders = await db
		.select({ pnl: tradeOrders.pnl, side: tradeOrders.side })
		.from(tradeOrders)
		.where(
			and(eq(tradeOrders.userId, userId), eq(tradeOrders.status, "FILLED"))
		)
		.orderBy(asc(tradeOrders.createdAt));

	const recentOrders = await db
		.select({ pnl: tradeOrders.pnl })
		.from(tradeOrders)
		.where(
			and(
				eq(tradeOrders.userId, userId),
				eq(tradeOrders.status, "FILLED"),
				eq(tradeOrders.side, "BUY")
			)
		)
		.orderBy(desc(tradeOrders.createdAt))
		.limit(50);

	const totalPnl = recentOrders.reduce((sum, o) => sum + Number(o.pnl ?? 0), 0);

	const drawdown = calcMaxDrawdown(snapshots);
	const streak = calcConsecutiveStreak(orders);

	return {
		consecutiveLosses: streak.consecutiveLosses,
		consecutiveWins: streak.consecutiveWins,
		drawdown,
		totalPnl,
	};
}
