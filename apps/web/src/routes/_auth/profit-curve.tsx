import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@trade-pilot/ui/components/button";
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

function AlertBanner({
	alerts,
}: {
	alerts: { content: string; id: string; isRead: boolean; type: string }[];
}) {
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

	const latest = unread.at(0);
	if (!latest) {
		return null;
	}

	return (
		<div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950">
			<div className="flex items-start justify-between">
				<div>
					<p className="font-semibold text-yellow-800 dark:text-yellow-200">
						⚠️ {ALERT_LABELS[latest.type] ?? "AI 提醒"} ({unread.length} 条未读)
					</p>
					<button
						className="mt-1 text-sm text-yellow-700 underline dark:text-yellow-300"
						onClick={() =>
							setExpandedId(expandedId === latest.id ? null : latest.id)
						}
						type="button"
					>
						{expandedId === latest.id ? "收起" : "展开阅读"}
					</button>
				</div>
				<Button
					onClick={() => markReadMutation.mutate({ alertId: latest.id })}
					size="sm"
					variant="outline"
				>
					标记已读
				</Button>
			</div>
			{expandedId === latest.id && (
				<p className="mt-3 whitespace-pre-wrap text-sm text-yellow-800 leading-relaxed dark:text-yellow-200">
					{latest.content}
				</p>
			)}
		</div>
	);
}

function MetricsCards({
	metrics,
}: {
	metrics: {
		consecutiveLosses: number;
		consecutiveWins: number;
		drawdown: { maxDrawdownPct: number };
		totalPnl: number;
	};
}) {
	let pnlColor = "";
	if (metrics.totalPnl > 0) {
		pnlColor = "text-green-600";
	} else if (metrics.totalPnl < 0) {
		pnlColor = "text-red-600";
	}

	return (
		<div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground text-xs">最大回撤</p>
				<p className="mt-1 font-semibold text-lg text-red-600">
					{(metrics.drawdown.maxDrawdownPct * 100).toFixed(1)}%
				</p>
			</div>
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground text-xs">总盈亏（不含手续费）</p>
				<p className={`mt-1 font-semibold text-lg ${pnlColor}`}>
					{metrics.totalPnl > 0 ? "+" : ""}
					{metrics.totalPnl.toFixed(2)} USDT
				</p>
			</div>
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground text-xs">连续盈利</p>
				<p className="mt-1 font-semibold text-green-600 text-lg">
					{metrics.consecutiveWins} 笔
				</p>
			</div>
			<div className="rounded-lg border p-3">
				<p className="text-muted-foreground text-xs">连续亏损</p>
				<p className="mt-1 font-semibold text-lg text-red-600">
					{metrics.consecutiveLosses} 笔
				</p>
			</div>
		</div>
	);
}

function AlertHistory({
	alerts,
}: {
	alerts: {
		content: string;
		generatedAt: Date | string;
		id: string;
		isRead: boolean;
		type: string;
	}[];
}) {
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
			<p className="py-4 text-center text-muted-foreground text-sm">
				暂无 AI 提醒记录
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{alerts.map((alert) => (
				<div
					className={`rounded-lg border p-3 ${alert.isRead ? "opacity-60" : ""}`}
					key={alert.id}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{!alert.isRead && (
								<span className="size-2 rounded-full bg-yellow-500" />
							)}
							<span className="font-medium text-sm">
								{ALERT_LABELS[alert.type] ?? alert.type}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground text-xs">
								{new Date(alert.generatedAt).toLocaleDateString("zh-CN")}
							</span>
							{!alert.isRead && (
								<Button
									onClick={() => markReadMutation.mutate({ alertId: alert.id })}
									size="sm"
									variant="ghost"
								>
									标记已读
								</Button>
							)}
						</div>
					</div>
					<button
						className="mt-1 text-left text-muted-foreground text-xs underline"
						onClick={() =>
							setExpandedId(expandedId === alert.id ? null : alert.id)
						}
						type="button"
					>
						{expandedId === alert.id ? "收起" : "展开内容"}
					</button>
					{expandedId === alert.id && (
						<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
							{alert.content}
						</p>
					)}
				</div>
			))}
		</div>
	);
}

function chartContent(
	isPending: boolean,
	snapshots: { balance: number; date: string }[]
): React.ReactNode {
	if (isPending) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				加载中...
			</p>
		);
	}
	if (snapshots.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				暂无快照数据。绑定 API Key
				后，每日系统自动采集资金快照，您的资金曲线将逐步呈现。
			</p>
		);
	}
	return (
		<ResponsiveContainer height={240} width="100%">
			<LineChart data={snapshots}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis
					dataKey="date"
					tick={{ fontSize: 11 }}
					tickFormatter={(v: string) => v.slice(5)}
				/>
				<YAxis tick={{ fontSize: 11 }} />
				<Tooltip />
				<Line
					dataKey="balance"
					dot={false}
					stroke="#3b82f6"
					strokeWidth={2}
					type="monotone"
				/>
			</LineChart>
		</ResponsiveContainer>
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

	return (
		<div className="mx-auto max-w-3xl p-6">
			<h1 className="mb-6 font-bold text-2xl">资金曲线</h1>

			{alertsQuery.data && <AlertBanner alerts={alertsQuery.data} />}

			{metricsQuery.data && <MetricsCards metrics={metricsQuery.data} />}

			<div className="mb-6 rounded-lg border p-4">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold">USDT 余额趋势</h2>
					<div className="flex gap-1">
						{RANGE_TABS.map((tab) => (
							<button
								className={`rounded px-2 py-1 font-medium text-xs transition-colors ${range === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
								key={tab.value}
								onClick={() => setRange(tab.value)}
								type="button"
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{chartContent(snapshotsQuery.isPending, snapshots)}
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-3 font-semibold">AI 提醒历史</h2>
				{alertsQuery.isPending ? (
					<p className="text-muted-foreground text-sm">加载中...</p>
				) : (
					<AlertHistory alerts={alertsQuery.data ?? []} />
				)}
			</div>
		</div>
	);
}
