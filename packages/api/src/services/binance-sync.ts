import { createHmac } from "node:crypto";
import { db } from "@trade-pilot/db";
import { alphaProjects } from "@trade-pilot/db/schema/alpha";
import { tradeOrders } from "@trade-pilot/db/schema/trading";
import { eq } from "drizzle-orm";

const BASE_URL =
	process.env.BINANCE_TESTNET === "true"
		? "https://testnet.binance.vision"
		: "https://api.binance.com";

export interface RawBinanceTrade {
	commission: string;
	commissionAsset: string;
	id: number;
	isBuyer: boolean;
	orderId: number;
	price: string;
	qty: string;
	symbol: string;
	time: number;
}

function sign(queryString: string, secret: string): string {
	return createHmac("sha256", secret).update(queryString).digest("hex");
}

async function fetchTrades(
	symbol: string,
	apiKey: string,
	secret: string,
	fromId?: number
): Promise<RawBinanceTrade[]> {
	const params: Record<string, string> = {
		symbol,
		limit: "500",
		timestamp: Date.now().toString(),
	};
	if (fromId !== undefined) {
		params.fromId = String(fromId + 1);
	}
	const queryString = new URLSearchParams(params).toString();
	const signature = sign(queryString, secret);

	const response = await fetch(
		`${BASE_URL}/api/v3/myTrades?${queryString}&signature=${signature}`,
		{
			headers: { "X-MBX-APIKEY": apiKey },
			signal: AbortSignal.timeout(15_000),
		}
	);

	if (!response.ok) {
		const err = (await response.json()) as { code: number; msg: string };
		throw new Error(`Binance myTrades error (${err.code}): ${err.msg}`);
	}

	return response.json() as Promise<RawBinanceTrade[]>;
}

export async function syncUserTrades(
	userId: string,
	apiKey: string,
	secret: string
): Promise<{ synced: number }> {
	const projects = await db
		.select({ binancePair: alphaProjects.binancePair })
		.from(alphaProjects)
		.where(eq(alphaProjects.isActive, true));

	let totalSynced = 0;

	for (const project of projects) {
		const lastOrder = await db
			.select({ binanceOrderId: tradeOrders.binanceOrderId })
			.from(tradeOrders)
			.where(eq(tradeOrders.userId, userId))
			.orderBy(tradeOrders.createdAt)
			.limit(1);

		const lastId = lastOrder.at(0)?.binanceOrderId
			? Number(lastOrder.at(0)?.binanceOrderId)
			: undefined;

		let trades: RawBinanceTrade[] = [];
		try {
			trades = await fetchTrades(project.binancePair, apiKey, secret, lastId);
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 200));
			continue;
		}

		for (const trade of trades) {
			const existing = await db
				.select({ id: tradeOrders.id })
				.from(tradeOrders)
				.where(eq(tradeOrders.binanceOrderId, String(trade.orderId)))
				.limit(1);

			if (existing.length > 0) {
				continue;
			}

			await db.insert(tradeOrders).values({
				userId,
				binanceOrderId: String(trade.orderId),
				symbol: trade.symbol,
				side: trade.isBuyer ? "BUY" : "SELL",
				type: "MARKET",
				executedQty: trade.qty,
				executedPrice: trade.price,
				commission: trade.commission,
				commissionAsset: trade.commissionAsset,
				status: "FILLED",
				source: "sync",
			});

			totalSynced++;
		}

		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return { synced: totalSynced };
}
