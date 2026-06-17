import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
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

function pnlClass(pnl: number): string {
	if (pnl > 0) {
		return "text-[#4edea3]";
	}
	if (pnl < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

function sideClass(side: string): string {
	return side === "BUY" ? "text-[#4edea3]" : "text-[#ffb4ab]";
}

function sideBadgeClass(side: string): string {
	return side === "BUY"
		? "bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/20"
		: "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20";
}

function formatDate(dateStr: string | null): string {
	if (!dateStr) {
		return "—";
	}
	const d = new Date(dateStr);
	return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

interface OrderRowProps {
	isSelected: boolean;
	onSelect: () => void;
	order: Order;
}

function OrderRow({ order, isSelected, onSelect }: OrderRowProps) {
	const pnl = Number(order.pnl ?? 0);
	const hasPnl = order.pnl !== null;

	return (
		<tr
			className={`cursor-pointer transition-colors ${isSelected ? "border-[#b4c5ff] border-l-4 bg-[#b4c5ff]/5" : "hover:bg-[#31394d]/50"}`}
			onClick={onSelect}
		>
			<td className="px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2d3449]">
						<span className={`text-xs ${sideClass(order.side)}`}>
							{order.symbol.slice(0, 3)}
						</span>
					</div>
					<div>
						<div className="font-bold text-[#dae2fd] text-sm">
							{order.symbol}
						</div>
						<div className="text-[#8d90a0] text-xs">现货订单</div>
					</div>
				</div>
			</td>
			<td className="px-5 py-4 text-center">
				<span
					className={`rounded border px-2 py-0.5 font-bold text-[10px] uppercase ${sideBadgeClass(order.side)}`}
				>
					{order.side === "BUY" ? "Long" : "Short"}
				</span>
			</td>
			<td className="px-5 py-4 text-[#c3c6d7] text-xs">
				{formatDate(order.createdAt)}
			</td>
			<td className="px-5 py-4 text-right">
				{hasPnl ? (
					<div className={`font-bold text-sm ${pnlClass(pnl)}`}>
						{pnl > 0 ? "+" : ""}
						{pnl.toFixed(4)} USDT
					</div>
				) : (
					<span className="text-[#8d90a0] text-sm">持仓中</span>
				)}
			</td>
			<td className="px-5 py-4 text-center">
				<Link
					className="inline-flex items-center gap-1 rounded bg-[#31394d] px-2 py-1 font-bold text-[#b4c5ff] text-[10px] hover:bg-[#2d3449]"
					onClick={(e) => e.stopPropagation()}
					params={{ orderId: order.id }}
					to="/orders/$orderId"
				>
					详情
				</Link>
			</td>
		</tr>
	);
}

const PNL_TABS: { label: string; value: PnlFilter }[] = [
	{ label: "全部", value: "all" },
	{ label: "盈利", value: "win" },
	{ label: "亏损", value: "loss" },
	{ label: "持仓中", value: "open" },
];

interface OrderStatsProps {
	orders: Order[];
}

function OrderStats({ orders }: OrderStatsProps) {
	const closed = orders.filter((o) => o.pnl !== null);
	const wins = closed.filter((o) => Number(o.pnl) > 0).length;
	const losses = closed.filter((o) => Number(o.pnl) < 0).length;
	const openCount = orders.filter((o) => o.pnl === null).length;
	const totalPnl = closed.reduce((sum, o) => sum + Number(o.pnl), 0);
	const winRate =
		closed.length > 0 ? ((wins / closed.length) * 100).toFixed(0) : "—";

	return (
		<div className="rounded-xl border border-[#2563eb]/30 bg-[#0f172a] p-5">
			<div className="mb-4 flex items-center gap-2">
				<Brain className="h-4 w-4 text-[#b4c5ff]" />
				<h4 className="font-bold text-[#b4c5ff] text-xs uppercase tracking-widest">
					当前筛选统计
				</h4>
			</div>
			<div className="space-y-4">
				<div>
					<p className="text-[#8d90a0] text-[10px] uppercase tracking-widest">
						胜率
					</p>
					<p className="mt-1 font-bold text-3xl text-[#dae2fd]">
						{winRate}
						{winRate !== "—" && (
							<span className="text-[#8d90a0] text-lg">%</span>
						)}
					</p>
					{closed.length > 0 && (
						<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#2d3449]">
							<div
								className="h-full bg-[#4edea3]"
								style={{ width: `${(wins / closed.length) * 100}%` }}
							/>
						</div>
					)}
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded bg-[#131b2e] p-3">
						<p className="text-[#8d90a0] text-[10px]">盈利单</p>
						<div className="mt-1 flex items-center gap-1">
							<TrendingUp className="h-3 w-3 text-[#4edea3]" />
							<p className="font-bold text-[#4edea3]">{wins}</p>
						</div>
					</div>
					<div className="rounded bg-[#131b2e] p-3">
						<p className="text-[#8d90a0] text-[10px]">亏损单</p>
						<div className="mt-1 flex items-center gap-1">
							<TrendingDown className="h-3 w-3 text-[#ffb4ab]" />
							<p className="font-bold text-[#ffb4ab]">{losses}</p>
						</div>
					</div>
					<div className="rounded bg-[#131b2e] p-3">
						<p className="text-[#8d90a0] text-[10px]">持仓中</p>
						<p className="mt-1 font-bold text-[#b4c5ff]">{openCount}</p>
					</div>
					<div className="rounded bg-[#131b2e] p-3">
						<p className="text-[#8d90a0] text-[10px]">已结算</p>
						<p className="mt-1 font-bold text-[#dae2fd]">{closed.length}</p>
					</div>
				</div>
				<div className="border-[#434655] border-t pt-3">
					<p className="text-[#8d90a0] text-[10px]">已实现盈亏合计</p>
					<p
						className={`mt-1 font-bold font-mono text-lg ${pnlClass(totalPnl)}`}
					>
						{totalPnl > 0 ? "+" : ""}
						{totalPnl.toFixed(4)} USDT
					</p>
				</div>
			</div>
		</div>
	);
}

function OrdersPage() {
	const [pnlFilter, setPnlFilter] = useState<PnlFilter>("all");
	const [page, setPage] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
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

	const orders: Order[] = ordersQuery.data ?? [];

	return (
		<div className="h-full overflow-y-auto bg-[#0b1326] text-[#dae2fd]">
			<div className="p-6">
				<section className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
					<div>
						<h2 className="font-bold text-3xl text-[#dae2fd]">
							交易记录 &amp; 日志
						</h2>
						<p className="mt-1 text-[#c3c6d7] text-sm">
							回顾、复盘并持续优化你的交易策略
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex gap-1 rounded-lg border border-[#434655] bg-[#222a3d] p-1">
							{PNL_TABS.map((tab) => (
								<button
									className={`rounded px-3 py-1.5 font-semibold text-xs transition-colors ${pnlFilter === tab.value ? "bg-[#2563eb] text-white" : "text-[#8d90a0] hover:text-[#dae2fd]"}`}
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
						<button
							className="flex items-center gap-2 rounded-lg border border-[#434655] bg-[#222a3d] px-3 py-2 text-[#dae2fd] text-xs transition-colors hover:bg-[#31394d] disabled:opacity-50"
							disabled={syncMutation.isPending}
							onClick={() => syncMutation.mutate()}
							type="button"
						>
							<RefreshCw
								className={`h-3 w-3 ${syncMutation.isPending ? "animate-spin" : ""}`}
							/>
							{syncMutation.isPending ? "同步中..." : "立即同步"}
						</button>
					</div>
				</section>

				<div className="grid grid-cols-12 gap-4">
					<div className="col-span-12 flex flex-col gap-4 xl:col-span-8">
						<div className="overflow-hidden rounded-xl border border-[#434655] bg-[#171f33]">
							<div className="flex items-center justify-between border-[#434655] border-b bg-[#222a3d] px-5 py-4">
								<h3 className="font-bold text-[#8d90a0] text-[10px] uppercase tracking-widest">
									已平仓订单
								</h3>
								<span className="text-[#8d90a0] text-xs">
									{ordersQuery.isPending
										? "加载中..."
										: `共 ${orders.length} 条`}
								</span>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-left">
									<thead className="border-[#434655]/50 border-b bg-[#131b2e]/50">
										<tr className="font-bold text-[#8d90a0] text-[10px] uppercase tracking-wider">
											<th className="px-5 py-4">资产</th>
											<th className="px-5 py-4 text-center">方向</th>
											<th className="px-5 py-4">时间</th>
											<th className="px-5 py-4 text-right">盈亏</th>
											<th className="px-5 py-4 text-center">操作</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[#434655]/30">
										{ordersQuery.isPending && (
											<tr>
												<td className="px-5 py-8 text-center" colSpan={5}>
													<div className="flex items-center justify-center gap-2 text-[#8d90a0] text-sm">
														<RefreshCw className="h-4 w-4 animate-spin" />
														加载中...
													</div>
												</td>
											</tr>
										)}
										{ordersQuery.isError && (
											<tr>
												<td
													className="px-5 py-8 text-center text-[#ffb4ab] text-sm"
													colSpan={5}
												>
													加载失败：{ordersQuery.error.message}
												</td>
											</tr>
										)}
										{!ordersQuery.isPending && orders.length === 0 && (
											<tr>
												<td
													className="px-5 py-8 text-center text-[#8d90a0] text-sm"
													colSpan={5}
												>
													暂无订单记录，请先同步或在 Alpha 定投页下单
												</td>
											</tr>
										)}
										{orders.map((order) => (
											<OrderRow
												isSelected={selectedId === order.id}
												key={order.id}
												onSelect={() => setSelectedId(order.id)}
												order={order}
											/>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{orders.length === limit && (
							<div className="flex justify-center gap-2">
								{page > 0 && (
									<button
										className="rounded-lg border border-[#434655] bg-[#222a3d] px-4 py-2 text-[#dae2fd] text-sm transition-colors hover:bg-[#31394d]"
										onClick={() => setPage((p) => p - 1)}
										type="button"
									>
										上一页
									</button>
								)}
								<button
									className="rounded-lg border border-[#434655] bg-[#222a3d] px-4 py-2 text-[#dae2fd] text-sm transition-colors hover:bg-[#31394d]"
									onClick={() => setPage((p) => p + 1)}
									type="button"
								>
									下一页
								</button>
							</div>
						)}
					</div>

					<aside className="col-span-12 xl:col-span-4">
						<OrderStats orders={orders} />
					</aside>
				</div>
			</div>
		</div>
	);
}
