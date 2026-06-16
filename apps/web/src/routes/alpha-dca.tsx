import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@trade-pilot/ui/components/skeleton";

import { AlphaSignalCard } from "@/components/alpha-dca/alpha-signal-card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/alpha-dca")({
	component: AlphaDcaPage,
});

const SKELETON_KEYS = ["sk1", "sk2", "sk3"] as const;

function AlphaDcaPage() {
	const signalsQuery = useQuery(trpc.alpha.getSignals.queryOptions());

	const lastScan =
		signalsQuery.data && signalsQuery.data.length > 0
			? new Date(signalsQuery.data[0].generatedAt).toLocaleString()
			: null;

	let content: React.ReactNode;

	if (signalsQuery.isLoading) {
		content = (
			<div className="flex flex-col gap-4">
				{SKELETON_KEYS.map((key) => (
					<Skeleton className="h-40 rounded-lg" key={key} />
				))}
			</div>
		);
	} else if (signalsQuery.error) {
		content = (
			<div className="rounded-lg border border-destructive p-4 text-destructive text-sm">
				加载失败：{signalsQuery.error.message}
			</div>
		);
	} else if (!signalsQuery.data || signalsQuery.data.length === 0) {
		content = (
			<div className="rounded-lg border p-8 text-center">
				<p className="text-muted-foreground">暂无符合条件的 Alpha 定投标的</p>
				<p className="mt-1 text-muted-foreground text-xs">
					系统每 6 小时扫描一次，请稍后查看
				</p>
			</div>
		);
	} else {
		content = (
			<div className="flex flex-col gap-4">
				{signalsQuery.data.map((signal) => (
					<AlphaSignalCard key={signal.id} signal={signal} />
				))}
			</div>
		);
	}

	return (
		<main className="container mx-auto max-w-3xl px-4 py-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Alpha 定投候选</h1>
				{lastScan && (
					<span className="text-muted-foreground text-sm">
						上次扫描：{lastScan}
					</span>
				)}
			</div>

			<div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400">
				本页面展示基于量化策略筛选出的 Binance Alpha
				底部盘整标的，仅供参考，不构成任何投资建议。
			</div>

			{content}
		</main>
	);
}
