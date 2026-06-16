import { db } from "@trade-pilot/db";
import { alphaProjects, alphaSignals } from "@trade-pilot/db/schema/alpha";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";

import { protectedProcedure, publicProcedure, router } from "../index";

export const alphaRouter = router({
	getSignals: publicProcedure.query(async () => {
		const signals = await db
			.select({
				id: alphaSignals.id,
				consolidationDays: alphaSignals.consolidationDays,
				drawdownFromAth: alphaSignals.drawdownFromAth,
				pricePercentile: alphaSignals.pricePercentile,
				atrRatio: alphaSignals.atrRatio,
				aiReason: alphaSignals.aiReason,
				generatedAt: alphaSignals.generatedAt,
				project: {
					id: alphaProjects.id,
					symbol: alphaProjects.symbol,
					name: alphaProjects.name,
					binancePair: alphaProjects.binancePair,
				},
			})
			.from(alphaSignals)
			.innerJoin(alphaProjects, eq(alphaSignals.projectId, alphaProjects.id))
			.where(
				and(eq(alphaSignals.isActive, true), eq(alphaProjects.isActive, true))
			)
			.orderBy(desc(alphaSignals.generatedAt));
		return signals;
	}),

	listProjects: publicProcedure.query(() =>
		db.select().from(alphaProjects).orderBy(alphaProjects.symbol)
	),

	addProject: protectedProcedure
		.input(
			z.object({
				binancePair: z.string().min(1),
				name: z.string().min(1),
				symbol: z.string().min(1),
			})
		)
		.mutation(async ({ input }) => {
			const [project] = await db
				.insert(alphaProjects)
				.values({
					binancePair: input.binancePair.toUpperCase(),
					name: input.name,
					symbol: input.symbol.toUpperCase(),
				})
				.returning();
			return project;
		}),

	removeProject: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ input }) => {
			await db
				.update(alphaProjects)
				.set({ isActive: false })
				.where(eq(alphaProjects.id, input.id));
			await db
				.update(alphaSignals)
				.set({ isActive: false })
				.where(eq(alphaSignals.projectId, input.id));
		}),
});
