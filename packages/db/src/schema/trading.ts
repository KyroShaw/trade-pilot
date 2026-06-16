import {
	boolean,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const userExchangeKeys = pgTable("user_exchange_keys", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull(),
	exchange: text("exchange").notNull().default("binance"),
	encryptedApiKey: text("encrypted_api_key").notNull(),
	encryptedSecret: text("encrypted_secret").notNull(),
	keyHint: text("key_hint"),
	hasTradePermission: boolean("has_trade_permission"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const tradeOrders = pgTable("trade_orders", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull(),
	binanceOrderId: text("binance_order_id"),
	symbol: text("symbol").notNull(),
	side: text("side").notNull(),
	type: text("type").notNull().default("MARKET"),
	requestedQtyUsdt: numeric("requested_qty_usdt"),
	executedQty: numeric("executed_qty"),
	executedPrice: numeric("executed_price"),
	commission: numeric("commission"),
	commissionAsset: text("commission_asset"),
	status: text("status").notNull(),
	errorMessage: text("error_message"),
	source: text("source").default("manual"),
	alphaSignalId: uuid("alpha_signal_id"),
	userOpenReason: text("user_open_reason"),
	userCloseReason: text("user_close_reason"),
	closedAt: timestamp("closed_at", { withTimezone: true }),
	pnl: numeric("pnl"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
