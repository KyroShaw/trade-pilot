import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bot, Sparkles, Target } from "lucide-react";
import { useState } from "react";

import { PlaceOrderDialog } from "@/components/place-order-dialog";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/alpha-dca")({
	component: AlphaDcaPage,
});

interface AlphaSignal {
	aiReason: string | null;
	atrRatio: string;
	consolidationDays: number;
	drawdownFromAth: string;
	generatedAt: Date | string;
	id: string;
	pricePercentile: string;
	project: {
		binancePair: string;
		id: string;
		name: string;
		symbol: string;
	};
}

function volatilityLabel(atrRatio: number): string {
	if (atrRatio < 0.5) {
		return "Low";
	}
	if (atrRatio < 1.0) {
		return "Mid";
	}
	return "High";
}

function volatilityClass(atrRatio: number): string {
	if (atrRatio < 0.5) {
		return "text-[#4edea3]";
	}
	if (atrRatio < 1.0) {
		return "text-[#ffb4ab]/70";
	}
	return "text-[#ffb4ab]";
}

function volatilityBarClass(atrRatio: number): string {
	if (atrRatio < 0.5) {
		return "bg-[#4edea3]";
	}
	if (atrRatio < 1.0) {
		return "bg-[#ffb4ab]/70";
	}
	return "bg-[#ffb4ab]";
}

function volatilityWidth(atrRatio: number): string {
	return `${Math.min(atrRatio * 50, 100)}%`;
}

function confidenceScore(days: number, atrRatio: number): number {
	const base = 70 + days * 0.8;
	const penalty = atrRatio * 5;
	return Math.min(98, Math.max(60, Math.round(base - penalty)));
}

function StrategyCard() {
	return (
		<div
			className="relative rounded-xl bg-[#0f172a] p-5"
			style={{
				border: "1px solid transparent",
				backgroundClip: "padding-box",
				boxShadow: "0 0 0 1px #b4c5ff22",
			}}
		>
			<div className="flex items-start justify-between">
				<div>
					<span className="rounded border border-[#b4c5ff]/20 bg-[#b4c5ff]/10 px-2 py-0.5 text-[#b4c5ff] text-[10px] uppercase tracking-widest">
						Active Strategy
					</span>
					<h2 className="mt-2 font-semibold text-[#dae2fd] text-xl">
						Binance Alpha 底部定投
					</h2>
				</div>
				<Sparkles className="h-5 w-5 text-[#b4c5ff]" />
			</div>
			<div className="mt-4 space-y-3">
				<p className="text-[#c3c6d7] text-sm leading-relaxed">
					核心逻辑：<span className="font-medium text-[#dae2fd]">底部盘整</span>
					。筛选自 ATH 大幅回撤后、在 ±5% 区间盘整超过 14 天的高实用性代币。
				</p>
				<div className="grid grid-cols-2 gap-4 pt-2">
					<div className="rounded bg-[#131b2e] p-3">
						<div className="text-[#8d90a0] text-[10px] uppercase tracking-wider">
							平均持仓
						</div>
						<div className="mt-1 font-bold font-mono text-[#dae2fd] text-lg">
							42 天
						</div>
					</div>
					<div className="rounded bg-[#131b2e] p-3">
						<div className="text-[#8d90a0] text-[10px] uppercase tracking-wider">
							风险等级
						</div>
						<div className="mt-1 font-bold text-[#4edea3] text-lg">中等</div>
					</div>
				</div>
			</div>
			<div className="mt-4 flex flex-col gap-1.5 border-[#434655] border-t pt-4">
				<div className="flex items-center gap-2 text-[#c3c6d7] text-xs">
					<Target className="h-3 w-3 text-[#4edea3]" />
					BTC 相关性过滤：0.65
				</div>
				<div className="flex items-center gap-2 text-[#c3c6d7] text-xs">
					<Target className="h-3 w-3 text-[#4edea3]" />
					ATR 收敛自动检测已启用
				</div>
			</div>
		</div>
	);
}

function RiskWarning() {
	return (
		<div className="flex gap-3 rounded-xl border border-[#ffb4ab]/20 bg-[#93000a]/10 p-4">
			<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb4ab]" />
			<div>
				<div className="font-bold text-[#ffb4ab] text-xs uppercase">
					风险提示
				</div>
				<p className="mt-1 text-[#c3c6d7] text-xs leading-relaxed">
					策略假设基于历史均值回归。过往表现不代表未来收益。市场流动性风险可能影响执行价格。本页面仅供参考，不构成任何投资建议。
				</p>
			</div>
		</div>
	);
}

interface SignalRowProps {
	isSelected: boolean;
	onSelect: () => void;
	signal: AlphaSignal;
}

function SignalRow({ signal, isSelected, onSelect }: SignalRowProps) {
	const atr = Number(signal.atrRatio);
	const score = confidenceScore(signal.consolidationDays, atr);
	const drawdownPct = (Number(signal.drawdownFromAth) * 100).toFixed(1);

	return (
		<tr
			className={`cursor-pointer transition-colors ${isSelected ? "border-[#b4c5ff] border-l-4 bg-[#b4c5ff]/5" : "hover:bg-[#31394d]"}`}
			onClick={onSelect}
		>
			<td className="px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b4c5ff]/20 font-bold text-[#b4c5ff] text-xs">
						{signal.project.symbol.slice(0, 4)}
					</div>
					<div>
						<div className="font-semibold text-[#dae2fd] text-sm">
							{signal.project.symbol}
						</div>
						<div className="text-[#8d90a0] text-xs">{signal.project.name}</div>
					</div>
				</div>
			</td>
			<td className="px-5 py-4 font-mono text-[#dae2fd] text-sm">
				{signal.consolidationDays} 天
			</td>
			<td className="px-5 py-4">
				<div className="flex items-center gap-2">
					<div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#2d3449]">
						<div
							className={`h-full ${volatilityBarClass(atr)}`}
							style={{ width: volatilityWidth(atr) }}
						/>
					</div>
					<span className={`font-mono text-xs ${volatilityClass(atr)}`}>
						{volatilityLabel(atr)}
					</span>
				</div>
			</td>
			<td className="px-5 py-4 text-[#ffb4ab] text-sm">-{drawdownPct}%</td>
			<td className="px-5 py-4 text-right">
				<span className="inline-flex items-center gap-1 rounded bg-[#4edea3]/10 px-2 py-0.5 font-mono text-[#4edea3] text-sm">
					{score}%
				</span>
			</td>
		</tr>
	);
}

interface CandidateTableProps {
	isLoading: boolean;
	onSelect: (signal: AlphaSignal) => void;
	selectedId: string | null;
	signals: AlphaSignal[];
}

function CandidateTable({
	signals,
	isLoading,
	selectedId,
	onSelect,
}: CandidateTableProps) {
	return (
		<div className="h-full overflow-hidden rounded-xl border border-[#434655] bg-[#171f33]">
			<div className="flex items-center justify-between border-[#434655] border-b px-5 py-4">
				<h3 className="font-semibold text-[#dae2fd] text-lg">Alpha 候选</h3>
				<span className="text-[#8d90a0] text-xs">
					{isLoading ? "扫描中..." : `${signals.length} 个标的`}
				</span>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left">
					<thead className="bg-[#222a3d]">
						<tr className="text-[#8d90a0] text-[10px] uppercase tracking-wider">
							<th className="px-5 py-4 font-semibold">代币</th>
							<th className="px-5 py-4 font-semibold">盘整天数</th>
							<th className="px-5 py-4 font-semibold">波动率</th>
							<th className="px-5 py-4 font-semibold">距 ATH 回撤</th>
							<th className="px-5 py-4 text-right font-semibold">AI 置信度</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[#434655]">
						{isLoading &&
							["r1", "r2", "r3"].map((k) => (
								<tr key={k}>
									<td className="px-5 py-4" colSpan={5}>
										<div className="h-8 animate-pulse rounded bg-[#222a3d]" />
									</td>
								</tr>
							))}
						{!isLoading && signals.length === 0 && (
							<tr>
								<td
									className="px-5 py-8 text-center text-[#8d90a0] text-sm"
									colSpan={5}
								>
									暂无符合条件的 Alpha 定投标的，系统每 6 小时扫描一次
								</td>
							</tr>
						)}
						{signals.map((signal) => (
							<SignalRow
								isSelected={selectedId === signal.id}
								key={signal.id}
								onSelect={() => onSelect(signal)}
								signal={signal}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

interface ThesisPanelProps {
	isBound: boolean | undefined;
	onOrder: () => void;
	signal: AlphaSignal | null;
}

function ThesisPanel({ signal, isBound, onOrder }: ThesisPanelProps) {
	if (!signal) {
		return (
			<div className="flex h-48 items-center justify-center rounded-xl border border-[#b4c5ff]/20 bg-[#0f172a]">
				<p className="text-[#8d90a0] text-sm">← 选择左侧候选查看 AI 研判</p>
			</div>
		);
	}
	const drawdownPct = (Number(signal.drawdownFromAth) * 100).toFixed(1);
	const percentile = (Number(signal.pricePercentile) * 100).toFixed(0);

	return (
		<div className="rounded-xl border border-[#b4c5ff]/20 bg-[#0f172a] p-5">
			<div className="mb-4 flex items-center gap-2">
				<Bot className="h-4 w-4 text-[#b4c5ff]" />
				<h4 className="font-bold text-[#b4c5ff] text-xs uppercase tracking-widest">
					AI 投资研判 — {signal.project.symbol}
				</h4>
			</div>
			<div className="mb-4 grid grid-cols-3 gap-3">
				<div className="rounded bg-[#131b2e] p-3">
					<div className="text-[#8d90a0] text-[10px]">盘整天数</div>
					<div className="mt-1 font-bold text-[#dae2fd]">
						{signal.consolidationDays}d
					</div>
				</div>
				<div className="rounded bg-[#131b2e] p-3">
					<div className="text-[#8d90a0] text-[10px]">距 ATH 回撤</div>
					<div className="mt-1 font-bold text-[#ffb4ab]">-{drawdownPct}%</div>
				</div>
				<div className="rounded bg-[#131b2e] p-3">
					<div className="text-[#8d90a0] text-[10px]">价格百分位</div>
					<div className="mt-1 font-bold text-[#b4c5ff]">{percentile}th</div>
				</div>
			</div>
			{signal.aiReason ? (
				<p className="mb-5 text-[#c3c6d7] text-sm leading-relaxed">
					{signal.aiReason}
				</p>
			) : (
				<p className="mb-5 text-[#8d90a0] text-sm">
					配置 LLM API Key 后可查看 AI 入选理由
				</p>
			)}
			<button
				className="w-full rounded-xl bg-[#b4c5ff] py-3 font-bold text-[#002a78] text-sm transition-all hover:opacity-90 active:scale-95"
				onClick={onOrder}
				type="button"
			>
				{isBound === false ? "前往设置绑定 API Key" : "加入执行队列"}
			</button>
		</div>
	);
}

function AlphaDcaPage() {
	const [selectedSignal, setSelectedSignal] = useState<AlphaSignal | null>(
		null
	);
	const [orderDialogOpen, setOrderDialogOpen] = useState(false);
	const navigate = useNavigate();

	const signalsQuery = useQuery(trpc.alpha.getSignals.queryOptions());
	const apiKeyStatusQuery = useQuery(
		trpc.trading.getApiKeyStatus.queryOptions()
	);

	const signals: AlphaSignal[] = signalsQuery.data ?? [];
	const isBound = apiKeyStatusQuery.data?.bound;

	const handleOrder = () => {
		if (isBound === false) {
			navigate({ to: "/settings" });
			return;
		}
		setOrderDialogOpen(true);
	};

	const lastScan =
		signals.length > 0
			? new Date(signals[0].generatedAt).toLocaleString()
			: null;

	return (
		<div className="h-full overflow-y-auto bg-[#0b1326] text-[#dae2fd]">
			<div className="p-6">
				<div className="mb-6 flex items-end justify-between">
					<div>
						<h2 className="font-bold text-3xl text-[#dae2fd]">Alpha 定投</h2>
						<p className="mt-1 text-[#c3c6d7] text-sm">
							基于量化策略筛选的 Binance Alpha 底部盘整候选
						</p>
					</div>
					{lastScan && (
						<span className="text-[#8d90a0] text-sm">上次扫描：{lastScan}</span>
					)}
				</div>

				<div className="grid grid-cols-12 gap-4">
					<section className="col-span-12 flex flex-col gap-4 lg:col-span-4">
						<StrategyCard />
						<RiskWarning />
					</section>

					<section className="col-span-12 lg:col-span-8">
						<CandidateTable
							isLoading={signalsQuery.isLoading}
							onSelect={setSelectedSignal}
							selectedId={selectedSignal?.id ?? null}
							signals={signals}
						/>
					</section>

					<section className="col-span-12">
						<ThesisPanel
							isBound={isBound}
							onOrder={handleOrder}
							signal={selectedSignal}
						/>
					</section>
				</div>
			</div>

			{selectedSignal && (
				<PlaceOrderDialog
					alphaSignalId={selectedSignal.id}
					binancePair={selectedSignal.project.binancePair}
					onOpenChange={setOrderDialogOpen}
					open={orderDialogOpen}
					projectName={selectedSignal.project.name}
				/>
			)}
		</div>
	);
}
