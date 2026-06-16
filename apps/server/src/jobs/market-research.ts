import {
	refreshNews,
	refreshSectors,
} from "@trade-pilot/api/services/market-research-refresh";
import type { LLMConfig } from "@trade-pilot/llm";
import cron from "node-cron";

let llmConfig: LLMConfig | null = null;

export function setMarketResearchLLMConfig(config: LLMConfig | null): void {
	llmConfig = config;
}

async function runSectorRefresh(): Promise<void> {
	try {
		await refreshSectors(llmConfig);
	} catch (error) {
		console.error("[market-research] sector refresh failed:", error);
	}
}

async function runNewsRefresh(): Promise<void> {
	try {
		await refreshNews(llmConfig);
	} catch (error) {
		console.error("[market-research] news refresh failed:", error);
	}
}

export function registerMarketResearchJobs(): void {
	cron.schedule("*/5 * * * *", runSectorRefresh);

	// News offset by 30s to avoid simultaneous CoinGecko calls within 15-min window
	cron.schedule("*/15 * * * *", () => {
		setTimeout(() => {
			runNewsRefresh().catch(console.error);
		}, 30_000);
	});

	runSectorRefresh().catch(console.error);
	setTimeout(() => {
		runNewsRefresh().catch(console.error);
	}, 5000);
}
