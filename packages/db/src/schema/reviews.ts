import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { tradeOrders } from "./trading";

export const tradeReviews = pgTable("trade_reviews", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id")
		.notNull()
		.references(() => tradeOrders.id)
		.unique(),
	userId: text("user_id").notNull(),
	basicReview: text("basic_review"),
	diagnosisReview: text("diagnosis_review"),
	basicGeneratedAt: timestamp("basic_generated_at", {
		withTimezone: true,
	}),
	diagnosisGeneratedAt: timestamp("diagnosis_generated_at", {
		withTimezone: true,
	}),
});
