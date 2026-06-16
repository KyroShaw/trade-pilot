const BASE_URL = "https://api.binance.com";

export interface BinanceKline {
	close: string;
	closeTime: number;
	high: string;
	low: string;
	open: string;
	openTime: number;
	volume: string;
}

export interface BinancePrice {
	price: string;
	symbol: string;
}

async function get<T>(
	path: string,
	params: Record<string, string>,
	retries = 2
): Promise<T> {
	const url = new URL(`${BASE_URL}${path}`);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}

	let lastError: unknown;
	for (let attempt = 0; attempt <= retries; attempt++) {
		if (attempt > 0) {
			await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
		}
		try {
			const response = await fetch(url.toString(), {
				headers: { Accept: "application/json" },
				signal: AbortSignal.timeout(15_000),
			});
			if (response.status === 429 || response.status === 418) {
				throw new Error(`Binance rate limited: ${response.status}`);
			}
			if (!response.ok) {
				throw new Error(
					`Binance API error: ${response.status} ${response.statusText}`
				);
			}
			return response.json() as Promise<T>;
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError;
}

export function fetchKlines(
	symbol: string,
	limit = 90
): Promise<BinanceKline[]> {
	return get<unknown[][]>("/api/v3/klines", {
		symbol,
		interval: "1d",
		limit: String(limit),
	}).then((rows) =>
		rows.map((row) => ({
			openTime: row[0] as number,
			open: row[1] as string,
			high: row[2] as string,
			low: row[3] as string,
			close: row[4] as string,
			volume: row[5] as string,
			closeTime: row[6] as number,
		}))
	);
}

export function fetchPrice(symbol: string): Promise<BinancePrice> {
	return get<BinancePrice>("/api/v3/ticker/price", { symbol });
}
