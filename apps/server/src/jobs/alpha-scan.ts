import { runAlphaScan } from "@trade-pilot/api/services/alpha-refresh";
import type { LLMConfig } from "@trade-pilot/llm";
import cron from "node-cron";

let llmConfig: LLMConfig | null = null;

export function setAlphaScanLLMConfig(config: LLMConfig | null): void {
	llmConfig = config;
}

async function runScan(): Promise<void> {
	try {
		await runAlphaScan(llmConfig);
	} catch (error) {
		console.error("[alpha-scan] scan failed:", error);
	}
}

export function registerAlphaScanJobs(): void {
	// Run every 6 hours
	cron.schedule("0 */6 * * *", runScan);

	// Run once on startup with a 10s offset to avoid simultaneous Binance calls
	setTimeout(() => {
		runScan().catch(console.error);
	}, 10_000);
}
