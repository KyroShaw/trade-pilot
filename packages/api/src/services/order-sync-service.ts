import { db } from "@trade-pilot/db";
import { tradeOrders, userExchangeKeys } from "@trade-pilot/db/schema/trading";
import type { LLMConfig } from "@trade-pilot/llm";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { decrypt } from "../utils/encryption";
import { syncUserTrades } from "./binance-sync";
import { matchAndCalculatePnl } from "./pnl-calculator";
import { generateBasicReview } from "./trade-review";

export async function syncAllUsersOrders(
	llmConfig: LLMConfig | null
): Promise<void> {
	const keys = await db.select().from(userExchangeKeys);

	for (const key of keys) {
		try {
			const apiKey = decrypt(key.encryptedApiKey);
			const secret = decrypt(key.encryptedSecret);

			await syncUserTrades(key.userId, apiKey, secret);
			await matchAndCalculatePnl(key.userId);

			const closedWithoutReview = await db
				.select({ id: tradeOrders.id, userId: tradeOrders.userId })
				.from(tradeOrders)
				.where(
					and(
						eq(tradeOrders.userId, key.userId),
						isNotNull(tradeOrders.closedAt),
						isNull(tradeOrders.pnl)
					)
				)
				.limit(5);

			for (const order of closedWithoutReview) {
				generateBasicReview(order.id, order.userId, llmConfig).catch(
					console.error
				);
			}
		} catch (err) {
			console.error(`[order-sync] failed for user ${key.userId}:`, err);
		}

		await new Promise((resolve) => setTimeout(resolve, 200));
	}
}
