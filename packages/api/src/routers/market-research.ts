import { db } from "@trade-pilot/db";
import { newsCache, sectorCache } from "@trade-pilot/db/schema/market-research";
import { desc } from "drizzle-orm";

import { publicProcedure, router } from "../index";

export const marketResearchRouter = router({
	getSectors: publicProcedure.query(async () =>
		db
			.select()
			.from(sectorCache)
			.orderBy(desc(sectorCache.marketCapChange24h))
			.limit(10)
	),

	getNews: publicProcedure.query(async () =>
		db.select().from(newsCache).orderBy(desc(newsCache.publishedAt)).limit(20)
	),

	getLastUpdated: publicProcedure.query(async () => {
		const [latestSector] = await db
			.select({ refreshedAt: sectorCache.refreshedAt })
			.from(sectorCache)
			.orderBy(desc(sectorCache.refreshedAt))
			.limit(1);
		const [latestNews] = await db
			.select({ cachedAt: newsCache.cachedAt })
			.from(newsCache)
			.orderBy(desc(newsCache.cachedAt))
			.limit(1);
		return {
			sectors: latestSector?.refreshedAt ?? null,
			news: latestNews?.cachedAt ?? null,
		};
	}),
});
