import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@trade-pilot/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/orders")({
	component: OrdersPage,
});

type PnlFilter = "all" | "loss" | "open" | "win";

interface Order {
	commissionAsset: string | null;
	createdAt: string | null;
	executedPrice: string | null;
	id: string;
	pnl: string | null;
	side: string;
	symbol: string;
}

function OrderCard({ order }: { order: Order }) {
	const pnl = Number(order.pnl ?? 0);
	let pnlColor = "text-muted-foreground";
	if (pnl > 0) {
		pnlColor = "text-green-600";
	} else if (pnl < 0) {
		pnlColor = "text-red-600";
	}
	const sideBg =
		order.side === "BUY"
			? "bg-green-100 text-green-700"
			: "bg-red-100 text-red-700";

	return (
		<Link
			className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
			params={{ orderId: order.id }}
			to="/orders/$orderId"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="font-medium">{order.symbol}</span>
					<span className={`rounded px-2 py-0.5 text-xs ${sideBg}`}>
						{order.side === "BUY" ? "买入" : "卖出"}
					</span>
				</div>
				<div className="text-right">
					{order.pnl === null ? (
						<span className="text-muted-foreground text-sm">持仓中</span>
					) : (
						<span className={`font-medium ${pnlColor}`}>
							{pnl > 0 ? "+" : ""}
							{pnl.toFixed(4)} USDT
						</span>
					)}
				</div>
			</div>
			<div className="mt-1 flex items-center justify-between text-muted-foreground text-sm">
				<span>成交价 {Number(order.executedPrice ?? 0).toFixed(4)}</span>
				<span>
					{order.createdAt
						? new Date(order.createdAt).toLocaleDateString("zh-CN")
						: "—"}
				</span>
			</div>
		</Link>
	);
}

const PNL_TABS: { label: string; value: PnlFilter }[] = [
	{ label: "全部", value: "all" },
	{ label: "盈利", value: "win" },
	{ label: "亏损", value: "loss" },
	{ label: "持仓中", value: "open" },
];

function OrdersPage() {
	const [pnlFilter, setPnlFilter] = useState<PnlFilter>("all");
	const [page, setPage] = useState(0);
	const limit = 20;

	const ordersQuery = useQuery(
		trpc.orders.getOrders.queryOptions({
			limit,
			offset: page * limit,
			pnlFilter,
		})
	);

	const syncMutation = useMutation(
		trpc.orders.syncNow.mutationOptions({
			onSuccess: (data) => {
				toast.success(`同步完成，新增 ${data.synced} 条记录`);
				queryClient.invalidateQueries(
					trpc.orders.getOrders.queryOptions({
						limit,
						offset: 0,
						pnlFilter: "all",
					})
				);
			},
			onError: (err) => {
				toast.error(err.message);
			},
		})
	);

	const orders = ordersQuery.data ?? [];

	let content: React.ReactNode;
	if (ordersQuery.isPending) {
		content = (
			<p className="py-8 text-center text-muted-foreground">加载中...</p>
		);
	} else if (ordersQuery.isError) {
		content = (
			<p className="py-8 text-center text-destructive">
				加载失败：{ordersQuery.error.message}
			</p>
		);
	} else if (orders.length === 0) {
		content = (
			<p className="py-8 text-center text-muted-foreground">
				暂无订单记录。请先同步或在 Alpha 定投页下单。
			</p>
		);
	} else {
		content = (
			<div className="space-y-2">
				{orders.map((order) => (
					<OrderCard key={order.id} order={order} />
				))}
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">我的订单</h1>
				<Button
					disabled={syncMutation.isPending}
					onClick={() => syncMutation.mutate()}
					size="sm"
				>
					{syncMutation.isPending ? "同步中..." : "立即同步"}
				</Button>
			</div>

			<div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
				{PNL_TABS.map((tab) => (
					<button
						className={`flex-1 rounded-md py-1.5 font-medium text-sm transition-colors ${pnlFilter === tab.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
						key={tab.value}
						onClick={() => {
							setPnlFilter(tab.value);
							setPage(0);
						}}
						type="button"
					>
						{tab.label}
					</button>
				))}
			</div>

			{content}

			{orders.length === limit && (
				<div className="mt-4 flex justify-center gap-2">
					{page > 0 && (
						<Button
							onClick={() => setPage((p) => p - 1)}
							size="sm"
							variant="outline"
						>
							上一页
						</Button>
					)}
					<Button
						onClick={() => setPage((p) => p + 1)}
						size="sm"
						variant="outline"
					>
						下一页
					</Button>
				</div>
			)}
		</div>
	);
}
