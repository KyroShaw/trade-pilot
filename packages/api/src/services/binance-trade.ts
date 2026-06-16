import { createHmac } from "node:crypto";

const BASE_URL =
	process.env.BINANCE_TESTNET === "true"
		? "https://testnet.binance.vision"
		: "https://api.binance.com";

export interface BinanceOrderResult {
	binanceOrderId: string;
	commission: string;
	commissionAsset: string;
	executedPrice: string;
	executedQty: string;
	side: string;
	status: string;
	symbol: string;
}

interface BinanceApiError {
	code: number;
	msg: string;
}

const ERROR_MESSAGES: Record<string, string> = {
	"-1000": "服务端未知错误",
	"-1001": "服务端处理超时，请稍后重试",
	"-1002": "未授权，请检查 API Key 是否正确",
	"-1003": "请求过于频繁，已触发限流",
	"-1006": "收到意外响应，请重试",
	"-1007": "服务端超时，请稍后重试",
	"-1010": "收到错误消息，请检查参数",
	"-1013": "数量无效，最小名义价值不满足",
	"-1015": "新订单触发限流",
	"-1016": "服务端不可达",
	"-1020": "不支持的操作",
	"-1021": "时间戳超出范围，请检查服务器时间同步",
	"-1022": "签名无效，请检查 Secret Key",
	"-1100": "参数格式错误",
	"-1111": "精度超出允许范围",
	"-1116": "订单类型不支持",
	"-2010": "账户余额不足",
	"-2011": "订单不存在",
	"-2013": "订单不存在",
	"-2014": "API Key 格式无效",
	"-2015": "API Key、IP 或权限不匹配",
	"-2021": "下单时间超出偏移范围",
};

function sign(queryString: string, secret: string): string {
	return createHmac("sha256", secret).update(queryString).digest("hex");
}

async function binanceRequest<T>(
	method: "GET" | "POST",
	path: string,
	params: Record<string, string>,
	apiKey: string,
	secret: string
): Promise<T> {
	const timestamp = Date.now().toString();
	const allParams = { ...params, timestamp };
	const queryString = new URLSearchParams(allParams).toString();
	const signature = sign(queryString, secret);
	const url =
		method === "GET"
			? `${BASE_URL}${path}?${queryString}&signature=${signature}`
			: `${BASE_URL}${path}`;

	const body =
		method === "POST" ? `${queryString}&signature=${signature}` : undefined;

	const response = await fetch(url, {
		method,
		headers: {
			"X-MBX-APIKEY": apiKey,
			...(method === "POST"
				? { "Content-Type": "application/x-www-form-urlencoded" }
				: {}),
		},
		body,
		signal: AbortSignal.timeout(15_000),
	});

	const data = (await response.json()) as T | BinanceApiError;

	if (!response.ok) {
		const err = data as BinanceApiError;
		const friendlyMsg = ERROR_MESSAGES[String(err.code)] ?? err.msg;
		throw new Error(`Binance API 错误 (${err.code}): ${friendlyMsg}`);
	}

	return data as T;
}

export async function validateApiKey(
	apiKey: string,
	secret: string
): Promise<{ hasTradePermission: boolean; valid: boolean }> {
	try {
		const account = await binanceRequest<{
			accountType: string;
			permissions: string[];
		}>("GET", "/api/v3/account", {}, apiKey, secret);

		const hasTradePermission =
			account.permissions.includes("SPOT") ||
			account.permissions.includes("TRADE");

		return { valid: true, hasTradePermission };
	} catch {
		return { valid: false, hasTradePermission: false };
	}
}

export async function placeMarketBuy(
	apiKey: string,
	secret: string,
	symbol: string,
	quoteQtyUsdt: number
): Promise<BinanceOrderResult> {
	const clientOrderId = crypto.randomUUID();

	const raw = await binanceRequest<{
		clientOrderId: string;
		cummulativeQuoteQty: string;
		executedQty: string;
		fills: { commission: string; commissionAsset: string; price: string }[];
		orderId: number;
		side: string;
		status: string;
		symbol: string;
	}>(
		"POST",
		"/api/v3/order",
		{
			newClientOrderId: clientOrderId,
			quoteOrderQty: quoteQtyUsdt.toString(),
			side: "BUY",
			symbol,
			type: "MARKET",
		},
		apiKey,
		secret
	);

	const firstFill = raw.fills.at(0);
	const totalQty = Number(raw.executedQty);
	const totalQuote = Number(raw.cummulativeQuoteQty);
	const avgPrice =
		totalQty > 0
			? (totalQuote / totalQty).toFixed(8)
			: (firstFill?.price ?? "0");

	const totalCommission = raw.fills.reduce(
		(sum, f) => sum + Number(f.commission),
		0
	);

	return {
		binanceOrderId: String(raw.orderId),
		commissionAsset: firstFill?.commissionAsset ?? "",
		executedPrice: avgPrice,
		executedQty: raw.executedQty,
		commission: totalCommission.toFixed(8),
		side: raw.side,
		status: raw.status,
		symbol: raw.symbol,
	};
}
