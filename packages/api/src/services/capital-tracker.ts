import { createHmac } from "node:crypto";
import { db } from "@trade-pilot/db";
import { capitalSnapshots } from "@trade-pilot/db/schema/profit-curve";

const BASE_URL =
	process.env.BINANCE_TESTNET === "true"
		? "https://testnet.binance.vision"
		: "https://api.binance.com";

function sign(queryString: string, secret: string): string {
	return createHmac("sha256", secret).update(queryString).digest("hex");
}

async function fetchUsdtBalance(
	apiKey: string,
	secret: string
): Promise<number> {
	const params = { timestamp: Date.now().toString() };
	const queryString = new URLSearchParams(params).toString();
	const signature = sign(queryString, secret);

	const response = await fetch(
		`${BASE_URL}/api/v3/account?${queryString}&signature=${signature}`,
		{
			headers: { "X-MBX-APIKEY": apiKey },
			signal: AbortSignal.timeout(15_000),
		}
	);

	if (!response.ok) {
		const err = (await response.json()) as { code: number; msg: string };
		throw new Error(`Binance account error (${err.code}): ${err.msg}`);
	}

	const account = (await response.json()) as {
		balances: { asset: string; free: string; locked: string }[];
	};

	for (const balance of account.balances) {
		if (balance.asset === "USDT") {
			return Number(balance.free) + Number(balance.locked);
		}
	}

	return 0;
}

export async function captureCapitalSnapshot(
	userId: string,
	apiKey: string,
	secret: string
): Promise<number> {
	const balance = await fetchUsdtBalance(apiKey, secret);
	const today = new Date().toISOString().slice(0, 10);

	await db
		.insert(capitalSnapshots)
		.values({
			userId,
			date: today,
			usdtBalance: balance.toFixed(8),
		})
		.onConflictDoUpdate({
			target: [capitalSnapshots.userId, capitalSnapshots.date],
			set: { usdtBalance: balance.toFixed(8) },
		});

	return balance;
}
