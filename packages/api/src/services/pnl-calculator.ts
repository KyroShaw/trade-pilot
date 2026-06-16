import { db } from "@trade-pilot/db";
import { tradeOrders } from "@trade-pilot/db/schema/trading";
import { and, eq, isNull } from "drizzle-orm";

export async function matchAndCalculatePnl(userId: string): Promise<void> {
	const orders = await db
		.select()
		.from(tradeOrders)
		.where(
			and(
				eq(tradeOrders.userId, userId),
				eq(tradeOrders.status, "FILLED"),
				isNull(tradeOrders.pnl)
			)
		)
		.orderBy(tradeOrders.createdAt);

	const bySymbol = new Map<string, (typeof tradeOrders.$inferSelect)[]>();
	for (const order of orders) {
		const existing = bySymbol.get(order.symbol) ?? [];
		existing.push(order);
		bySymbol.set(order.symbol, existing);
	}

	for (const symbolOrders of bySymbol.values()) {
		const buys = symbolOrders.filter((o) => o.side === "BUY");
		const sells = symbolOrders.filter((o) => o.side === "SELL");

		for (const sell of sells) {
			const buy = buys.shift();
			if (!buy) {
				break;
			}

			const entryPrice = Number(buy.executedPrice ?? 0);
			const exitPrice = Number(sell.executedPrice ?? 0);
			const qty = Math.min(
				Number(buy.executedQty ?? 0),
				Number(sell.executedQty ?? 0)
			);
			const pnl = (exitPrice - entryPrice) * qty;

			await db
				.update(tradeOrders)
				.set({
					pnl: pnl.toFixed(8),
					closedAt: sell.createdAt,
				})
				.where(eq(tradeOrders.id, buy.id));

			await db
				.update(tradeOrders)
				.set({ pnl: "0" })
				.where(eq(tradeOrders.id, sell.id));
		}
	}
}
