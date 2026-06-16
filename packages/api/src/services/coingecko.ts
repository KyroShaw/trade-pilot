const BASE_URL = "https://api.coingecko.com/api/v3";

export interface CoinGeckoCategory {
	id: string;
	market_cap_change_24h: number | null;
	name: string;
}

export interface CoinGeckoMarketCoin {
	name: string;
	price_change_percentage_24h: number | null;
	symbol: string;
	total_volume: number;
}

export interface CoinGeckoNewsItem {
	author: string | null;
	id: string;
	published_at: string;
	title: string;
	url: string;
}

async function get<T>(
	path: string,
	params?: Record<string, string>
): Promise<T> {
	const url = new URL(`${BASE_URL}${path}`);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}
	const response = await fetch(url.toString(), {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(15_000),
	});
	if (!response.ok) {
		throw new Error(
			`CoinGecko API error: ${response.status} ${response.statusText}`
		);
	}
	return response.json() as Promise<T>;
}

export function fetchCategories(): Promise<CoinGeckoCategory[]> {
	return get<CoinGeckoCategory[]>("/coins/categories");
}

export function fetchCategoryTokens(
	categoryId: string
): Promise<CoinGeckoMarketCoin[]> {
	return get<CoinGeckoMarketCoin[]>("/coins/markets", {
		vs_currency: "usd",
		category: categoryId,
		order: "volume_desc",
		per_page: "5",
		page: "1",
	});
}

export async function fetchNews(): Promise<CoinGeckoNewsItem[]> {
	const data = await get<{ data: CoinGeckoNewsItem[] }>("/news");
	return data.data ?? [];
}
