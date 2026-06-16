import type { BinanceKline } from "./binance-market";

export interface StrategyResult {
	atrRatio: number;
	consolidationDays: number;
	drawdownFromAth: number;
	pricePercentile: number;
	qualified: boolean;
}

function calcTrueRange(high: number, low: number, prevClose: number): number {
	return Math.max(
		high - low,
		Math.abs(high - prevClose),
		Math.abs(low - prevClose)
	);
}

function calcATR(klines: BinanceKline[]): number {
	if (klines.length < 2) {
		return 0;
	}
	let sum = 0;
	let count = 0;
	let prevClose: number | undefined;
	for (const kline of klines) {
		if (prevClose !== undefined) {
			sum += calcTrueRange(Number(kline.high), Number(kline.low), prevClose);
			count++;
		}
		prevClose = Number(kline.close);
	}
	return count > 0 ? sum / count : 0;
}

function calcATRAvg(klines: BinanceKline[], period: number): number {
	if (klines.length < period + 1) {
		return calcATR(klines);
	}
	let total = 0;
	let count = 0;
	for (let i = period; i < klines.length; i++) {
		total += calcATR(klines.slice(i - period, i + 1));
		count++;
	}
	return count > 0 ? total / count : 0;
}

function countConsolidationDays(
	klines: BinanceKline[],
	currentPrice: number,
	bandPct: number
): number {
	const lower = currentPrice * (1 - bandPct);
	const upper = currentPrice * (1 + bandPct);
	let days = 0;
	for (const kline of [...klines].reverse()) {
		const close = Number(kline.close);
		if (close >= lower && close <= upper) {
			days++;
		} else {
			break;
		}
	}
	return days;
}

export function detectConsolidation(klines: BinanceKline[]): StrategyResult {
	if (klines.length < 20) {
		return {
			qualified: false,
			consolidationDays: 0,
			drawdownFromAth: 0,
			pricePercentile: 1,
			atrRatio: 1,
		};
	}

	const ath = Math.max(...klines.map((k) => Number(k.high)));
	const currentPrice = Number(klines.at(-1)?.close ?? 0);
	const drawdownFromAth = (ath - currentPrice) / ath;

	const closes = klines.map((k) => Number(k.close)).sort((a, b) => a - b);
	const rank = closes.findIndex((c) => c >= currentPrice);
	const pricePercentile = rank === -1 ? 1 : rank / closes.length;

	const recent14 = klines.slice(-15);
	const atr14 = calcATR(recent14);
	const atr20Avg = calcATRAvg(klines.slice(-35), 20);
	const atrRatio = atr20Avg > 0 ? atr14 / atr20Avg : 1;

	const consolidationDays = countConsolidationDays(klines, currentPrice, 0.15);

	const qualified =
		consolidationDays >= 14 &&
		atrRatio < 1.0 &&
		drawdownFromAth >= 0.6 &&
		pricePercentile < 0.3;

	return {
		atrRatio,
		consolidationDays,
		drawdownFromAth,
		pricePercentile,
		qualified,
	};
}

export function getAlphaSignalPrompt(
	projectName: string,
	metrics: Omit<StrategyResult, "qualified">
): string {
	return `你是一名加密货币量化分析师。以下是 Binance Alpha 项目"${projectName}"的量化盘整指标，请生成一段入选理由摘要（50字以内）：
- 盘整天数：${metrics.consolidationDays} 天
- 距历史最高价回撤：${(metrics.drawdownFromAth * 100).toFixed(1)}%
- 当前价格在近90天低位区间：${(metrics.pricePercentile * 100).toFixed(1)}th 百分位
- ATR 收敛比率：${metrics.atrRatio.toFixed(2)}（<1.0 表示波动收敛）

请说明为什么这个项目符合底部盘整特征，适合关注定投机会。不做价格预测，不给投资建议。`;
}
