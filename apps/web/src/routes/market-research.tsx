import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart2, Plus, Sparkles, TrendingUp } from "lucide-react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/market-research")({
	component: MarketResearchPage,
});

interface Token {
	name: string;
	priceChange24h: number;
	symbol: string;
	volume: number;
}

interface Sector {
	aiSummary: string | null;
	categoryId: string;
	marketCapChange24h: string | null;
	name: string;
	topTokens: Token[];
}

interface NewsItem {
	aiInterpretation: string | null;
	id: string;
	publishedAt: Date | string | null;
	source: string | null;
	title: string;
	url: string;
}

function changeNum(sector: Sector): number {
	return Number.parseFloat(sector.marketCapChange24h ?? "0");
}

function changeClass(n: number): string {
	if (n > 0) {
		return "text-[#4edea3]";
	}
	if (n < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

function tokenChangeClass(n: number): string {
	if (n > 0) {
		return "text-[#4edea3]";
	}
	if (n < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

function heatBg(n: number): string {
	if (n > 5) {
		return "bg-[#4edea3]/40 border-[#4edea3]";
	}
	if (n > 0) {
		return "bg-[#4edea3]/20 border-[#4edea3]/40";
	}
	if (n < -5) {
		return "bg-[#ffb4ab]/40 border-[#ffb4ab]";
	}
	if (n < 0) {
		return "bg-[#ffb4ab]/20 border-[#ffb4ab]/40";
	}
	return "bg-[#222a3d] border-[#434655]";
}

function heatLabel(n: number): string {
	if (n > 5) {
		return "High Heat";
	}
	if (n > 0) {
		return "Rising Heat";
	}
	if (n < 0) {
		return "Cooling";
	}
	return "Neutral";
}

function heatLabelClass(n: number): string {
	if (n > 0) {
		return "text-[#4edea3]";
	}
	if (n < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

interface HeatTileProps {
	large: boolean;
	sector: Sector;
}

function SectorHeatTile({ sector, large }: HeatTileProps) {
	const n = changeNum(sector);
	const displayName =
		sector.name.length > 8 ? `${sector.name.slice(0, 7)}…` : sector.name;
	return (
		<div
			className={`${large ? "col-span-2 row-span-2" : ""} ${heatBg(n)} flex cursor-pointer items-center justify-center rounded-lg border transition-all hover:opacity-80`}
		>
			<div className="text-center">
				<span className="block font-bold text-[#dae2fd] text-xs">
					{displayName}
				</span>
				<span className={`font-mono text-xs ${changeClass(n)}`}>
					{n >= 0 ? "+" : ""}
					{n.toFixed(1)}%
				</span>
			</div>
		</div>
	);
}

function SectorHeatmap({ sectors }: { sectors: Sector[] }) {
	if (sectors.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center text-[#8d90a0] text-sm">
				暂无板块数据
			</div>
		);
	}
	return (
		<div className="grid h-48 grid-cols-8 gap-2">
			{sectors.slice(0, 8).map((sector, i) => (
				<SectorHeatTile key={sector.categoryId} large={i < 2} sector={sector} />
			))}
		</div>
	);
}

function SectorCard({ sector }: { sector: Sector }) {
	const n = changeNum(sector);
	const heatWidth = `${Math.min(Math.abs(n) * 10, 100)}%`;
	return (
		<div className="flex flex-col overflow-hidden rounded-xl border border-[#1e293b] bg-[#0f172a]/60 backdrop-blur-xl transition-all hover:border-[#b4c5ff]/50">
			<div className="flex items-start justify-between bg-[#222a3d]/50 p-5">
				<div>
					<h4 className="font-bold text-[#dae2fd] text-lg">{sector.name}</h4>
					<div className="mt-1 flex items-center gap-2">
						<div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#171f33]">
							<div
								className={`h-full ${n >= 0 ? "bg-[#4edea3]" : "bg-[#ffb4ab]"}`}
								style={{ width: heatWidth }}
							/>
						</div>
						<span className={`font-semibold text-xs ${heatLabelClass(n)}`}>
							{heatLabel(n)}
						</span>
					</div>
				</div>
				<div className="text-right">
					<span className={`font-bold font-mono text-lg ${changeClass(n)}`}>
						{n >= 0 ? "+" : ""}
						{n.toFixed(2)}%
					</span>
					<span className="block text-[#8d90a0] text-xs">24h 变化</span>
				</div>
			</div>
			<div className="flex-1 p-5">
				<span className="mb-2 block font-semibold text-[#8d90a0] text-xs uppercase tracking-wider">
					龙头币种
				</span>
				<div className="space-y-2">
					{sector.topTokens.slice(0, 3).map((token) => (
						<div
							className="flex items-center justify-between border-[#434655]/30 border-b py-1 last:border-0"
							key={token.symbol}
						>
							<div className="flex items-center gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#b4c5ff]/20 font-bold text-[#b4c5ff] text-[10px]">
									{token.symbol.slice(0, 3)}
								</div>
								<span className="font-bold text-[#dae2fd] text-sm">
									{token.symbol}
								</span>
							</div>
							<span
								className={`font-mono text-sm ${tokenChangeClass(token.priceChange24h)}`}
							>
								{token.priceChange24h >= 0 ? "+" : ""}
								{token.priceChange24h.toFixed(1)}%
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function MacroFeedItem({ item }: { item: NewsItem }) {
	const time = item.publishedAt
		? new Date(item.publishedAt).toLocaleTimeString("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: null;
	const borderColor = item.aiInterpretation
		? "border-[#4edea3]"
		: "border-[#8d90a0]";
	return (
		<div className={`space-y-2 border-l-2 ${borderColor} py-1 pl-4`}>
			<div className="flex items-start justify-between">
				<a
					className="font-bold text-[#dae2fd] text-sm leading-tight hover:underline"
					href={item.url}
					rel="noopener noreferrer"
					target="_blank"
				>
					{item.title}
				</a>
				{time && (
					<span className="ml-2 shrink-0 font-mono text-[#8d90a0] text-xs">
						{time}
					</span>
				)}
			</div>
			{item.aiInterpretation && (
				<p className="rounded bg-[#222a3d]/50 p-2 text-[#c3c6d7] text-xs italic">
					<span className="font-bold text-[#dae2fd]">AI 解读：</span>
					{item.aiInterpretation}
				</p>
			)}
		</div>
	);
}

function StatsBar({ sectors }: { sectors: Sector[] }) {
	const topSector = sectors.reduce<Sector | null>((best, s) => {
		if (!best) {
			return s;
		}
		return changeNum(s) > changeNum(best) ? s : best;
	}, null);
	const positiveCount = sectors.filter((s) => changeNum(s) > 0).length;
	const topN = topSector ? changeNum(topSector) : 0;

	return (
		<div className="col-span-12 flex gap-4 overflow-x-auto">
			<div className="min-w-[160px] flex-1 rounded-xl border border-[#1e293b] bg-[#0f172a]/70 p-5 backdrop-blur-xl">
				<span className="mb-1 block text-[#8d90a0] text-xs">顶部板块</span>
				<div className="flex items-center justify-between">
					<span className="font-bold text-[#dae2fd]">
						{topSector?.name ?? "—"}
					</span>
					<span className={`font-bold font-mono text-sm ${changeClass(topN)}`}>
						{topN >= 0 ? "+" : ""}
						{topN.toFixed(1)}%
					</span>
				</div>
			</div>
			<div className="min-w-[160px] flex-1 rounded-xl border border-[#1e293b] bg-[#0f172a]/70 p-5 backdrop-blur-xl">
				<span className="mb-1 block text-[#8d90a0] text-xs">活跃板块数</span>
				<div className="flex items-center justify-between">
					<span className="font-bold font-mono text-[#dae2fd] text-xl">
						{sectors.length}
					</span>
					<BarChart2 className="h-4 w-4 text-[#b4c5ff]" />
				</div>
			</div>
			<div className="min-w-[160px] flex-1 rounded-xl border border-[#1e293b] bg-[#0f172a]/70 p-5 backdrop-blur-xl">
				<span className="mb-1 block text-[#8d90a0] text-xs">正收益板块</span>
				<div className="flex items-center justify-between">
					<span className="font-bold font-mono text-[#4edea3] text-xl">
						{positiveCount}
					</span>
					<TrendingUp className="h-4 w-4 text-[#4edea3]" />
				</div>
			</div>
		</div>
	);
}

function SectorsPanel({
	sectors,
	isLoading,
}: {
	isLoading: boolean;
	sectors: Sector[];
}) {
	if (isLoading) {
		return (
			<>
				<div className="h-48 animate-pulse rounded-xl bg-[#222a3d]" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{["k1", "k2", "k3", "k4"].map((k) => (
						<div
							className="h-52 animate-pulse rounded-xl bg-[#222a3d]"
							key={k}
						/>
					))}
				</div>
			</>
		);
	}

	return (
		<>
			<div className="rounded-xl border border-[#1e293b] bg-[#0f172a]/70 p-5 backdrop-blur-xl">
				<h3 className="mb-4 font-semibold text-[#dae2fd] text-lg">
					板块轮动热力图（24h）
				</h3>
				<SectorHeatmap sectors={sectors} />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{sectors.slice(0, 4).map((sector) => (
					<SectorCard key={sector.categoryId} sector={sector} />
				))}
				<div className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-[#434655] border-dashed transition-all hover:border-[#b4c5ff]">
					<Plus className="mb-2 h-8 w-8 text-[#8d90a0]" />
					<span className="text-[#8d90a0] text-sm">监控新板块</span>
				</div>
			</div>
		</>
	);
}

function MacroFeedPanel({
	items,
	isLoading,
}: {
	isLoading: boolean;
	items: NewsItem[];
}) {
	return (
		<div className="flex min-h-[600px] flex-col rounded-xl border border-[#2563eb]/30 bg-[#0f172a] backdrop-blur-xl">
			<div className="flex items-center justify-between border-[#434655] border-b p-5">
				<div className="flex items-center gap-2">
					<Sparkles className="h-4 w-4 text-[#b4c5ff]" />
					<h3 className="font-semibold text-[#dae2fd]">宏观消息 AI 解读</h3>
				</div>
				<span className="rounded-full bg-[#2563eb]/20 px-3 py-1 text-[#b4c5ff] text-xs">
					实时
				</span>
			</div>
			<div className="flex-1 space-y-4 overflow-y-auto p-5">
				{isLoading && (
					<div className="space-y-3">
						{["n1", "n2", "n3"].map((k) => (
							<div
								className="h-16 animate-pulse rounded-lg bg-[#222a3d]"
								key={k}
							/>
						))}
					</div>
				)}
				{!isLoading && items.length === 0 && (
					<p className="py-8 text-center text-[#8d90a0] text-sm">
						暂无新闻，请在设置中配置 LLM API Key 以启用 AI 解读
					</p>
				)}
				{items.map((item) => (
					<MacroFeedItem item={item} key={item.id} />
				))}
			</div>
		</div>
	);
}

function MarketResearchPage() {
	const sectorsQuery = useQuery(trpc.marketResearch.getSectors.queryOptions());
	const newsQuery = useQuery(trpc.marketResearch.getNews.queryOptions());
	const lastUpdatedQuery = useQuery(
		trpc.marketResearch.getLastUpdated.queryOptions()
	);

	const sectors: Sector[] = sectorsQuery.data ?? [];
	const news: NewsItem[] = newsQuery.data ?? [];
	const lastUpdated = lastUpdatedQuery.data?.sectors
		? new Date(lastUpdatedQuery.data.sectors).toLocaleTimeString()
		: null;

	return (
		<div className="h-full overflow-y-auto bg-[#0b1326] text-[#dae2fd]">
			<div className="p-6">
				<section className="mb-6">
					<div className="mb-4 flex items-end justify-between">
						<div>
							<h2 className="font-bold text-3xl text-[#dae2fd]">行情调研</h2>
							<p className="mt-1 text-[#c3c6d7] text-sm">
								实时板块轮动与宏观消息面
							</p>
						</div>
						{lastUpdated && (
							<span className="text-[#8d90a0] text-sm">
								上次更新：{lastUpdated}
							</span>
						)}
					</div>
					{!sectorsQuery.isLoading && sectors.length > 0 && (
						<div className="grid grid-cols-12 gap-4">
							<StatsBar sectors={sectors} />
						</div>
					)}
				</section>

				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-12 flex flex-col gap-4 xl:col-span-8">
						<SectorsPanel
							isLoading={sectorsQuery.isLoading}
							sectors={sectors}
						/>
					</div>
					<aside className="col-span-12 xl:col-span-4">
						<MacroFeedPanel isLoading={newsQuery.isLoading} items={news} />
					</aside>
				</div>
			</div>
		</div>
	);
}
