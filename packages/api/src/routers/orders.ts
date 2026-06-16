import { db } from "@trade-pilot/db";
import { tradeReviews } from "@trade-pilot/db/schema/reviews";
import { tradeOrders, userExchangeKeys } from "@trade-pilot/db/schema/trading";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod/v4";
import { protectedProcedure, router } from "../index";
import { syncUserTrades } from "../services/binance-sync";
import { matchAndCalculatePnl } from "../services/pnl-calculator";
import { generateDiagnosisReview } from "../services/trade-review";
import { decrypt } from "../utils/encryption";

export const ordersRouter = router({
	getOrders: protectedProcedure
		.input(
			z.object({
				limit: z.number().int().positive().max(100).default(20),
				offset: z.number().int().min(0).default(0),
				pnlFilter: z.enum(["all", "win", "loss", "open"]).default("all"),
				symbol: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const orders = await db
				.select()
				.from(tradeOrders)
				.where(
					and(
						eq(tradeOrders.userId, userId),
						eq(tradeOrders.status, "FILLED"),
						input.symbol ? eq(tradeOrders.symbol, input.symbol) : undefined
					)
				)
				.orderBy(desc(tradeOrders.createdAt))
				.limit(input.limit)
				.offset(input.offset);

			if (input.pnlFilter === "all") {
				return orders;
			}
			if (input.pnlFilter === "open") {
				return orders.filter((o) => !o.closedAt);
			}
			if (input.pnlFilter === "win") {
				return orders.filter((o) => Number(o.pnl ?? 0) > 0);
			}
			return orders.filter((o) => Number(o.pnl ?? 0) < 0);
		}),

	getOrderDetail: protectedProcedure
		.input(z.object({ orderId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [order] = await db
				.select()
				.from(tradeOrders)
				.where(
					and(eq(tradeOrders.id, input.orderId), eq(tradeOrders.userId, userId))
				)
				.limit(1);

			if (!order) {
				return null;
			}

			const [review] = await db
				.select()
				.from(tradeReviews)
				.where(eq(tradeReviews.orderId, input.orderId))
				.limit(1);

			return { order, review: review ?? null };
		}),

	updateTradeNote: protectedProcedure
		.input(
			z.object({
				closeReason: z.string(),
				openReason: z.string(),
				orderId: z.string().uuid(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			await db
				.update(tradeOrders)
				.set({
					userOpenReason: input.openReason,
					userCloseReason: input.closeReason,
				})
				.where(
					and(eq(tradeOrders.id, input.orderId), eq(tradeOrders.userId, userId))
				);
		}),

	syncNow: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const [key] = await db
			.select()
			.from(userExchangeKeys)
			.where(
				and(
					eq(userExchangeKeys.userId, userId),
					eq(userExchangeKeys.exchange, "binance")
				)
			)
			.limit(1);

		if (!key) {
			throw new Error("未绑定 Binance API Key");
		}

		const apiKey = decrypt(key.encryptedApiKey);
		const secret = decrypt(key.encryptedSecret);

		const result = await syncUserTrades(userId, apiKey, secret);
		await matchAndCalculatePnl(userId);

		return result;
	}),

	regenerateDiagnosis: protectedProcedure
		.input(z.object({ orderId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [order] = await db
				.select()
				.from(tradeOrders)
				.where(
					and(
						eq(tradeOrders.id, input.orderId),
						eq(tradeOrders.userId, userId),
						isNotNull(tradeOrders.userOpenReason)
					)
				)
				.limit(1);

			if (!order) {
				throw new Error("订单不存在或尚未填写开仓理由");
			}

			await generateDiagnosisReview(
				input.orderId,
				order.userOpenReason ?? "",
				order.userCloseReason ?? "",
				null
			);
		}),
});
