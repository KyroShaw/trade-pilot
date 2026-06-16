import { syncAllUsersOrders } from "@trade-pilot/api/services/order-sync-service";
import type { LLMConfig } from "@trade-pilot/llm";
import cron from "node-cron";

let llmConfig: LLMConfig | null = null;

export function setOrderSyncLLMConfig(config: LLMConfig | null): void {
	llmConfig = config;
}

export function registerOrderSyncJobs(): void {
	cron.schedule("*/15 * * * *", () => {
		syncAllUsersOrders(llmConfig).catch(console.error);
	});

	setTimeout(() => {
		syncAllUsersOrders(llmConfig).catch(console.error);
	}, 30_000);
}
