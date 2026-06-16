import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type LLMProvider = "openai" | "anthropic";

export interface LLMConfig {
	apiKey: string;
	model?: string;
	provider: LLMProvider;
}

const DEFAULT_MODELS: Record<LLMProvider, string> = {
	openai: "gpt-4o",
	anthropic: "claude-sonnet-4-6",
};

const DEFAULT_TIMEOUT_MS = 10_000;

export async function callLLM(
	config: LLMConfig,
	prompt: string,
	options: { timeoutMs?: number } = {}
): Promise<string | null> {
	const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;
	const model = config.model ?? DEFAULT_MODELS[config.provider];
	const signal = AbortSignal.timeout(timeoutMs);

	try {
		if (config.provider === "openai") {
			const client = new OpenAI({ apiKey: config.apiKey });
			const response = await client.chat.completions.create(
				{
					model,
					messages: [{ role: "user", content: prompt }],
					max_tokens: 1024,
				},
				{ signal }
			);
			return response.choices[0]?.message.content ?? null;
		}

		const client = new Anthropic({ apiKey: config.apiKey });
		const response = await client.messages.create(
			{
				model,
				max_tokens: 1024,
				messages: [{ role: "user", content: prompt }],
			},
			{ signal }
		);
		const block = response.content[0];
		return block?.type === "text" ? block.text : null;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return null;
		}
		throw error;
	}
}
