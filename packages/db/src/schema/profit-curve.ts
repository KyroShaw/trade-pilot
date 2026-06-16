import {
	boolean,
	date,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

export const capitalSnapshots = pgTable(
	"capital_snapshots",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id").notNull(),
		date: date("date").notNull(),
		usdtBalance: numeric("usdt_balance").notNull(),
		source: text("source").notNull().default("binance"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [unique().on(t.userId, t.date)]
);

export const aiAlerts = pgTable("ai_alerts", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull(),
	type: text("type").notNull(),
	content: text("content").notNull(),
	triggerContext: jsonb("trigger_context"),
	isRead: boolean("is_read").notNull().default(false),
	generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
});
