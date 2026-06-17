import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Brain,
	RefreshCw,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/profit-curve")({
	component: ProfitCurvePage,
});

type Range = "7d" | "30d" | "90d" | "all";

const RANGE_TABS: { label: string; value: Range }[] = [
	{ label: "7天", value: "7d" },
	{ label: "30天", value: "30d" },
	{ label: "90天", value: "90d" },
	{ label: "全部", value: "all" },
];

const ALERT_LABELS: Record<string, string> = {
	consecutive_loss: "连续亏损预警",
	consecutive_win: "连续盈利提示",
	weekly_risk: "周度风险报告",
};

interface Alert {
	content: string;
	generatedAt: Date | string;
	id: string;
	isRead: boolean;
	type: string;
}

interface Metrics {
	consecutiveLosses: number;
	consecutiveWins: number;
	drawdown: { maxDrawdownPct: number };
	totalPnl: number;
}

function AlertBanner({ alerts }: { alerts: Alert[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const markReadMutation = useMutation(
		trpc.profitCurve.markAlertRead.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(
					trpc.profitCurve.getAlerts.queryOptions({ unreadOnly: false })
				);
			},
		})
	);

	const unread = alerts.filter((a) => !a.isRead);
	if (unread.length === 0) {
		return null;
	}

	const latest = unread[0];
	if (!latest) {
		return null;
	}

	return (
		<div className="mb-6 rounded-xl border border-[#cf2c30]/30 bg-[#93000a]/10 p-5">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ffb4ab]" />
					<div>
						<p className="font-bold text-[#ffb4ab]">
							{ALERT_LABELS[latest.type] ?? "AI 提醒"}
							<span className="ml-2 text-[#ffb4ab]/60 text-xs">
								（{unread.length} 条未读）
							</span>
						</p>
						<button
							className="mt-1 text-[#ffb4ab]/80 text-xs underline hover:text-[#ffb4ab]"
							onClick={() =>
								setExpandedId(expandedId === latest.id ? null : latest.id)
							}
							type="button"
						>
							{expandedId === latest.id ? "收起" : "展开阅读"}
						</button>
					</div>
				</div>
				<button
					className="rounded-lg border border-[#434655] px-3 py-1.5 text-[#dae2fd] text-xs transition-colors hover:bg-[#31394d]"
					onClick={() => markReadMutation.mutate({ alertId: latest.id })}
					type="button"
				>
					标记已读
				</button>
			</div>
			{expandedId === latest.id && (
				<p className="mt-3 whitespace-pre-wrap text-[#c3c6d7] text-sm leading-relaxed">
					{latest.content}
				</p>
			)}
		</div>
	);
}

function MetricsRow({ metrics }: { metrics: Metrics }) {
	const pnlPositive = metrics.totalPnl > 0;
	const pnlClass = pnlPositive ? "text-[#4edea3]" : "text-[#ffb4ab]";

	return (
		<div className="flex flex-col gap-4 xl:col-span-4">
			<div className="flex-1 rounded-xl border border-[#434655] bg-[#222a3d] p-5">
				<div className="mb-2 flex items-center gap-2">
					<TrendingDown className="h-3 w-3 text-[#b4c5ff]" />
					<span className="text-[#8d90a0] text-[10px] uppercase tracking-widest">
						最大回撤
					</span>
				</div>
				<p className="font-bold text-4xl text-[#ffb4ab]">
					{(metrics.drawdown.maxDrawdownPct * 100).toFixed(1)}
					<span className="text-[#8d90a0] text-xl">%</span>
				</p>
				<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#131b2e]">
					<div
						className="h-full bg-[#ffb4ab]"
						style={{
							width: `${Math.min(metrics.drawdown.maxDrawdownPct * 100, 100)}%`,
						}}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-[#434655] bg-[#171f33] p-4">
					<p className="text-[#8d90a0] text-[10px]">已实现盈亏</p>
					<p className={`mt-1 font-bold font-mono text-lg ${pnlClass}`}>
						{pnlPositive ? "+" : ""}
						{metrics.totalPnl.toFixed(2)}
					</p>
					<p className="text-[#8d90a0] text-[10px]">USDT</p>
				</div>
				<div className="rounded-xl border border-[#434655] bg-[#171f33] p-4">
					<p className="text-[#8d90a0] text-[10px]">连续盈利</p>
					<div className="mt-1 flex items-center gap-1">
						<TrendingUp className="h-3 w-3 text-[#4edea3]" />
						<p className="font-bold text-[#4edea3] text-lg">
							{metrics.consecutiveWins}
						</p>
					</div>
					<p className="text-[#8d90a0] text-[10px]">笔</p>
				</div>
				<div className="col-span-2 rounded-xl border border-[#434655] bg-[#171f33] p-4">
					<p className="text-[#8d90a0] text-[10px]">连续亏损</p>
					<div className="mt-1 flex items-center gap-1">
						<TrendingDown className="h-3 w-3 text-[#ffb4ab]" />
						<p className="font-bold text-[#ffb4ab] text-lg">
							{metrics.consecutiveLosses}
						</p>
						<span className="text-[#8d90a0] text-xs">笔</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function ChartPanel({
	isPending,
	range,
	setRange,
	snapshots,
}: {
	isPending: boolean;
	range: Range;
	setRange: (r: Range) => void;
	snapshots: { balance: number; date: string }[];
}) {
	return (
		<div className="col-span-12 rounded-xl border border-[#434655] bg-[#171f33] p-5 xl:col-span-8">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-[#dae2fd] text-lg">资产权益表现</h2>
					<p className="text-[#8d90a0] text-xs">USDT 余额趋势追踪</p>
				</div>
				<div className="flex gap-1 rounded-lg border border-[#434655] bg-[#222a3d] p-1">
					{RANGE_TABS.map((tab) => (
						<button
							className={`rounded px-3 py-1 font-semibold text-xs transition-colors ${range === tab.value ? "bg-[#2563eb] text-white" : "text-[#8d90a0] hover:text-[#dae2fd]"}`}
							key={tab.value}
							onClick={() => setRange(tab.value)}
							type="button"
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{isPending && (
				<div className="flex h-64 items-center justify-center text-[#8d90a0] text-sm">
					<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
					加载中...
				</div>
			)}
			{!isPending && snapshots.length === 0 && (
				<div className="flex h-64 items-center justify-center text-center text-[#8d90a0] text-sm">
					<p>
						暂无快照数据。绑定 API Key 后，
						<br />
						每日系统自动采集资金快照，资金曲线将逐步呈现。
					</p>
				</div>
			)}
			{!isPending && snapshots.length > 0 && (
				<ResponsiveContainer height={240} width="100%">
					<LineChart data={snapshots}>
						<CartesianGrid stroke="#434655" strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							stroke="#8d90a0"
							tick={{ fill: "#8d90a0", fontSize: 11 }}
							tickFormatter={(v: string) => v.slice(5)}
						/>
						<YAxis stroke="#8d90a0" tick={{ fill: "#8d90a0", fontSize: 11 }} />
						<Tooltip
							contentStyle={{
								backgroundColor: "#171f33",
								border: "1px solid #434655",
								borderRadius: "8px",
								color: "#dae2fd",
							}}
						/>
						<Line
							dataKey="balance"
							dot={false}
							stroke="#2563eb"
							strokeWidth={2}
							type="monotone"
						/>
					</LineChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}

function AlertHistory({ alerts }: { alerts: Alert[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const markReadMutation = useMutation(
		trpc.profitCurve.markAlertRead.mutationOptions({
			onSuccess: () => {
				toast.success("已标记为已读");
				queryClient.invalidateQueries(
					trpc.profitCurve.getAlerts.queryOptions({ unreadOnly: false })
				);
			},
		})
	);

	if (alerts.length === 0) {
		return (
			<p className="py-4 text-center text-[#8d90a0] text-sm">
				暂无 AI 提醒记录
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{alerts.map((alert) => (
				<div
					className={`rounded-xl border border-[#434655] bg-[#171f33] p-4 transition-opacity ${alert.isRead ? "opacity-50" : ""}`}
					key={alert.id}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{!alert.isRead && (
								<span className="h-2 w-2 rounded-full bg-[#ffb4ab]" />
							)}
							<span className="font-semibold text-[#dae2fd] text-sm">
								{ALERT_LABELS[alert.type] ?? alert.type}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-[#8d90a0] text-xs">
								{new Date(alert.generatedAt).toLocaleDateString("zh-CN")}
							</span>
							{!alert.isRead && (
								<button
									className="rounded px-2 py-0.5 text-[#8d90a0] text-xs hover:text-[#dae2fd]"
									onClick={() => markReadMutation.mutate({ alertId: alert.id })}
									type="button"
								>
									标记已读
								</button>
							)}
						</div>
					</div>
					<button
						className="mt-1 text-left text-[#8d90a0] text-xs underline"
						onClick={() =>
							setExpandedId(expandedId === alert.id ? null : alert.id)
						}
						type="button"
					>
						{expandedId === alert.id ? "收起" : "展开内容"}
					</button>
					{expandedId === alert.id && (
						<p className="mt-2 whitespace-pre-wrap text-[#c3c6d7] text-sm leading-relaxed">
							{alert.content}
						</p>
					)}
				</div>
			))}
		</div>
	);
}

function CalmCenter({
	alerts,
	isPending,
}: {
	alerts: Alert[];
	isPending: boolean;
}) {
	const hasUnread = alerts.some((a) => !a.isRead);

	return (
		<div className="rounded-xl border border-[#434655] bg-[#171f33]">
			<div className="flex items-center gap-3 border-[#434655] border-b p-5">
				<div
					className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasUnread ? "bg-[#ffb4ab]/10" : "bg-[#b4c5ff]/10"}`}
				>
					<Brain
						className={`h-5 w-5 ${hasUnread ? "text-[#ffb4ab]" : "text-[#b4c5ff]"}`}
					/>
				</div>
				<div>
					<h4 className="font-semibold text-[#dae2fd]">Calm Center</h4>
					<p className="text-[#8d90a0] text-xs">
						{hasUnread ? "检测到未读 AI 预警" : "AI 提醒历史"}
					</p>
				</div>
				{hasUnread && (
					<AlertTriangle className="ml-auto h-4 w-4 animate-pulse text-[#ffb4ab]" />
				)}
			</div>
			<div className="p-5">
				{isPending ? (
					<p className="text-[#8d90a0] text-sm">加载中...</p>
				) : (
					<AlertHistory alerts={alerts} />
				)}
			</div>
		</div>
	);
}

function ProfitCurvePage() {
	const [range, setRange] = useState<Range>("30d");

	const snapshotsQuery = useQuery(
		trpc.profitCurve.getSnapshots.queryOptions({ range })
	);
	const metricsQuery = useQuery(trpc.profitCurve.getMetrics.queryOptions());
	const alertsQuery = useQuery(
		trpc.profitCurve.getAlerts.queryOptions({ unreadOnly: false })
	);

	const snapshots = (snapshotsQuery.data ?? []).map((s) => ({
		date: s.date,
		balance: Number(s.usdtBalance),
	}));

	const alerts: Alert[] = alertsQuery.data ?? [];

	return (
		<div className="h-full overflow-y-auto bg-[#0b1326] text-[#dae2fd]">
			<div className="p-6">
				<div className="mb-6">
					<h2 className="font-bold text-3xl text-[#dae2fd]">资金曲线</h2>
					<p className="mt-1 text-[#c3c6d7] text-sm">权益表现与风险分析中心</p>
				</div>

				{alertsQuery.data && <AlertBanner alerts={alertsQuery.data} />}

				<div className="mb-4 grid grid-cols-12 gap-4">
					<ChartPanel
						isPending={snapshotsQuery.isPending}
						range={range}
						setRange={setRange}
						snapshots={snapshots}
					/>

					<div className="col-span-12 xl:col-span-4">
						{metricsQuery.isPending && (
							<div className="space-y-3">
								{["m1", "m2", "m3"].map((k) => (
									<div
										className="h-24 animate-pulse rounded-xl bg-[#222a3d]"
										key={k}
									/>
								))}
							</div>
						)}
						{metricsQuery.data && <MetricsRow metrics={metricsQuery.data} />}
					</div>
				</div>

				<CalmCenter alerts={alerts} isPending={alertsQuery.isPending} />
			</div>
		</div>
	);
}
