import {
	checkAndTriggerAlerts,
	checkWeeklyRisk,
} from "@trade-pilot/api/services/alert-trigger";
import { captureCapitalSnapshot } from "@trade-pilot/api/services/capital-tracker";
import { decrypt } from "@trade-pilot/api/utils/encryption";
import { db } from "@trade-pilot/db";
import { userExchangeKeys } from "@trade-pilot/db/schema/trading";
import type { LLMConfig } from "@trade-pilot/llm";
import cron from "node-cron";

let llmConfig: LLMConfig | null = null;

export function setProfitTrackerLLMConfig(config: LLMConfig | null): void {
	llmConfig = config;
}

async function captureAllSnapshots(): Promise<void> {
	const keys = await db.select().from(userExchangeKeys);
	for (const key of keys) {
		try {
			const apiKey = decrypt(key.encryptedApiKey);
			const secret = decrypt(key.encryptedSecret);
			await captureCapitalSnapshot(key.userId, apiKey, secret);
			await checkAndTriggerAlerts(key.userId, llmConfig);
		} catch (err) {
			console.error(`[profit-tracker] snapshot failed for ${key.userId}:`, err);
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
}

async function weeklyRiskCheck(): Promise<void> {
	const keys = await db.select().from(userExchangeKeys);
	for (const key of keys) {
		try {
			const apiKey = decrypt(key.encryptedApiKey);
			const secret = decrypt(key.encryptedSecret);
			await captureCapitalSnapshot(key.userId, apiKey, secret);
			await checkWeeklyRisk(key.userId, llmConfig);
		} catch (err) {
			console.error(
				`[profit-tracker] weekly risk check failed for ${key.userId}:`,
				err
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
}

export function registerProfitTrackerJobs(): void {
	// Every day at 00:05 UTC
	cron.schedule("5 0 * * *", () => {
		captureAllSnapshots().catch(console.error);
	});

	// Every Monday at 00:10 UTC
	cron.schedule("10 0 * * 1", () => {
		weeklyRiskCheck().catch(console.error);
	});
}
