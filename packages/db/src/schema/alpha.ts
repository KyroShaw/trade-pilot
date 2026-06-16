import {
	boolean,
	date,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

export const alphaProjects = pgTable("alpha_projects", {
	id: uuid("id").primaryKey().defaultRandom(),
	symbol: text("symbol").notNull().unique(),
	name: text("name").notNull(),
	binancePair: text("binance_pair").notNull(),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const alphaKlineCache = pgTable(
	"alpha_kline_cache",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => alphaProjects.id),
		date: date("date").notNull(),
		open: numeric("open").notNull(),
		high: numeric("high").notNull(),
		low: numeric("low").notNull(),
		close: numeric("close").notNull(),
		volume: numeric("volume").notNull(),
	},
	(t) => [unique().on(t.projectId, t.date)]
);

export const alphaSignals = pgTable("alpha_signals", {
	id: uuid("id").primaryKey().defaultRandom(),
	projectId: uuid("project_id")
		.notNull()
		.references(() => alphaProjects.id),
	consolidationDays: integer("consolidation_days").notNull(),
	drawdownFromAth: numeric("drawdown_from_ath").notNull(),
	pricePercentile: numeric("price_percentile").notNull(),
	atrRatio: numeric("atr_ratio").notNull(),
	aiReason: text("ai_reason"),
	generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
	isActive: boolean("is_active").notNull().default(true),
});
