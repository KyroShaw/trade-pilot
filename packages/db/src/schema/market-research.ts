import {
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const sectorCache = pgTable("sector_cache", {
	id: uuid("id").primaryKey().defaultRandom(),
	categoryId: text("category_id").notNull().unique(),
	name: text("name").notNull(),
	marketCapChange24h: numeric("market_cap_change_24h"),
	topTokens: jsonb("top_tokens").notNull().$type<
		Array<{
			symbol: string;
			name: string;
			priceChange24h: number;
			volume: number;
		}>
	>(),
	aiSummary: text("ai_summary"),
	refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
});

export const newsCache = pgTable("news_cache", {
	id: uuid("id").primaryKey().defaultRandom(),
	externalId: text("external_id").notNull().unique(),
	title: text("title").notNull(),
	url: text("url").notNull(),
	source: text("source"),
	publishedAt: timestamp("published_at", { withTimezone: true }),
	aiInterpretation: text("ai_interpretation"),
	cachedAt: timestamp("cached_at", { withTimezone: true }).notNull(),
});
