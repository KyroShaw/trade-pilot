import { db } from "@trade-pilot/db";
import { tradeOrders, userExchangeKeys } from "@trade-pilot/db/schema/trading";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";

import { protectedProcedure, router } from "../index";
import { placeMarketBuy, validateApiKey } from "../services/binance-trade";
import { decrypt, encrypt } from "../utils/encryption";

export const tradingRouter = router({
	bindApiKey: protectedProcedure
		.input(
			z.object({
				apiKey: z.string().min(1),
				secret: z.string().min(1),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { valid, hasTradePermission } = await validateApiKey(
				input.apiKey,
				input.secret
			);

			if (!valid) {
				throw new Error("API Key 无效，请检查 Key 和 Secret 是否正确");
			}

			const encryptedApiKey = encrypt(input.apiKey);
			const encryptedSecret = encrypt(input.secret);
			const keyHint = input.apiKey.slice(-4);

			await db
				.delete(userExchangeKeys)
				.where(
					and(
						eq(userExchangeKeys.userId, userId),
						eq(userExchangeKeys.exchange, "binance")
					)
				);

			await db.insert(userExchangeKeys).values({
				userId,
				exchange: "binance",
				encryptedApiKey,
				encryptedSecret,
				keyHint,
				hasTradePermission,
			});

			return { keyHint, hasTradePermission };
		}),

	getApiKeyStatus: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const [key] = await db
			.select({
				hasTradePermission: userExchangeKeys.hasTradePermission,
				keyHint: userExchangeKeys.keyHint,
			})
			.from(userExchangeKeys)
			.where(
				and(
					eq(userExchangeKeys.userId, userId),
					eq(userExchangeKeys.exchange, "binance")
				)
			)
			.limit(1);

		if (!key) {
			return { bound: false, hasTradePermission: null, keyHint: null };
		}

		return {
			bound: true,
			hasTradePermission: key.hasTradePermission,
			keyHint: key.keyHint,
		};
	}),

	removeApiKey: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		await db
			.delete(userExchangeKeys)
			.where(
				and(
					eq(userExchangeKeys.userId, userId),
					eq(userExchangeKeys.exchange, "binance")
				)
			);
	}),

	placeOrder: protectedProcedure
		.input(
			z.object({
				alphaSignalId: z.string().uuid().optional(),
				quoteQtyUsdt: z.number().positive(),
				symbol: z.string().min(1),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [keyRow] = await db
				.select()
				.from(userExchangeKeys)
				.where(
					and(
						eq(userExchangeKeys.userId, userId),
						eq(userExchangeKeys.exchange, "binance")
					)
				)
				.limit(1);

			if (!keyRow) {
				throw new Error("未绑定 Binance API Key，请先在设置页绑定");
			}

			const apiKey = decrypt(keyRow.encryptedApiKey);
			const secret = decrypt(keyRow.encryptedSecret);

			try {
				const result = await placeMarketBuy(
					apiKey,
					secret,
					input.symbol,
					input.quoteQtyUsdt
				);

				const [order] = await db
					.insert(tradeOrders)
					.values({
						userId,
						binanceOrderId: result.binanceOrderId,
						symbol: result.symbol,
						side: result.side,
						type: "MARKET",
						requestedQtyUsdt: String(input.quoteQtyUsdt),
						executedQty: result.executedQty,
						executedPrice: result.executedPrice,
						commission: result.commission,
						commissionAsset: result.commissionAsset,
						status: result.status,
						source: input.alphaSignalId ? "alpha_signal" : "manual",
						alphaSignalId: input.alphaSignalId,
					})
					.returning();

				return { order, success: true };
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "未知错误";

				await db.insert(tradeOrders).values({
					userId,
					symbol: input.symbol,
					side: "BUY",
					type: "MARKET",
					requestedQtyUsdt: String(input.quoteQtyUsdt),
					status: "FAILED",
					errorMessage,
					source: input.alphaSignalId ? "alpha_signal" : "manual",
					alphaSignalId: input.alphaSignalId,
				});

				throw new Error(errorMessage);
			}
		}),

	getMyOrders: protectedProcedure
		.input(
			z.object({
				limit: z.number().int().positive().max(100).default(20),
				offset: z.number().int().min(0).default(0),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const orders = await db
				.select()
				.from(tradeOrders)
				.where(eq(tradeOrders.userId, userId))
				.orderBy(desc(tradeOrders.createdAt))
				.limit(input.limit)
				.offset(input.offset);
			return orders;
		}),
});
