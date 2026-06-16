import { db } from "@trade-pilot/db";
import {
	aiAlerts,
	capitalSnapshots,
} from "@trade-pilot/db/schema/profit-curve";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { z } from "zod/v4";
import { protectedProcedure, router } from "../index";
import { getUserMetrics } from "../services/capital-metrics";

const RANGE_DAYS: Record<string, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
};

export const profitCurveRouter = router({
	getSnapshots: protectedProcedure
		.input(
			z.object({
				range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
			})
		)
		.query(({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const days = RANGE_DAYS[input.range];

			return db
				.select({
					date: capitalSnapshots.date,
					usdtBalance: capitalSnapshots.usdtBalance,
				})
				.from(capitalSnapshots)
				.where(
					and(
						eq(capitalSnapshots.userId, userId),
						days
							? gte(
									capitalSnapshots.date,
									new Date(Date.now() - days * 86_400_000)
										.toISOString()
										.slice(0, 10)
								)
							: undefined
					)
				)
				.orderBy(asc(capitalSnapshots.date));
		}),

	getMetrics: protectedProcedure.query(async ({ ctx }) =>
		getUserMetrics(ctx.session.user.id)
	),

	getAlerts: protectedProcedure
		.input(
			z.object({
				unreadOnly: z.boolean().default(false),
			})
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const alerts = await db
				.select()
				.from(aiAlerts)
				.where(
					and(
						eq(aiAlerts.userId, userId),
						input.unreadOnly ? eq(aiAlerts.isRead, false) : undefined
					)
				)
				.orderBy(desc(aiAlerts.generatedAt))
				.limit(50);
			return alerts;
		}),

	markAlertRead: protectedProcedure
		.input(z.object({ alertId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await db
				.update(aiAlerts)
				.set({ isRead: true })
				.where(
					and(
						eq(aiAlerts.id, input.alertId),
						eq(aiAlerts.userId, ctx.session.user.id)
					)
				);
		}),
});
