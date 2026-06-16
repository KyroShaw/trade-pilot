import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@trade-pilot/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/orders/$orderId")({
	component: OrderDetailPage,
});

interface NoteProps {
	closeReason: string;
	isRegenerating: boolean;
	isSaving: boolean;
	onCloseReasonChange: (v: string) => void;
	onOpenReasonChange: (v: string) => void;
	onRegenerate: () => void;
	onSave: () => void;
	openReason: string;
	savedCloseReason: string;
	savedOpenReason: string;
}

function NoteSection({
	closeReason,
	isRegenerating,
	isSaving,
	onCloseReasonChange,
	onOpenReasonChange,
	onRegenerate,
	onSave,
	openReason,
	savedCloseReason,
	savedOpenReason,
}: NoteProps) {
	const effectiveOpen = openReason || savedOpenReason;
	const effectiveClose = closeReason || savedCloseReason;

	return (
		<div className="rounded-lg border p-4">
			<h2 className="mb-3 font-semibold">我的交易笔记</h2>
			<div className="space-y-3">
				<div>
					<label
						className="mb-1 block font-medium text-sm"
						htmlFor="openReason"
					>
						开仓理由
					</label>
					<textarea
						className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						defaultValue={savedOpenReason}
						id="openReason"
						onChange={(e) => onOpenReasonChange(e.target.value)}
						placeholder="为什么选择在此时入场？"
						rows={3}
					/>
				</div>
				<div>
					<label
						className="mb-1 block font-medium text-sm"
						htmlFor="closeReason"
					>
						平仓理由
					</label>
					<textarea
						className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						defaultValue={savedCloseReason}
						id="closeReason"
						onChange={(e) => onCloseReasonChange(e.target.value)}
						placeholder="为什么选择在此时出场？"
						rows={3}
					/>
				</div>
				<div className="flex gap-2">
					<Button disabled={isSaving} onClick={onSave} size="sm">
						{isSaving ? "保存中..." : "保存笔记"}
					</Button>
					{(effectiveOpen || effectiveClose) && (
						<Button
							disabled={isRegenerating}
							onClick={onRegenerate}
							size="sm"
							variant="outline"
						>
							{isRegenerating ? "生成中..." : "生成对照诊断"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function OrderDetailPage() {
	const { orderId } = Route.useParams();
	const detailQuery = useQuery(
		trpc.orders.getOrderDetail.queryOptions({ orderId })
	);

	const [openReason, setOpenReason] = useState("");
	const [closeReason, setCloseReason] = useState("");

	const saveNoteMutation = useMutation(
		trpc.orders.updateTradeNote.mutationOptions({
			onSuccess: () => {
				toast.success("已保存交易笔记");
				queryClient.invalidateQueries(
					trpc.orders.getOrderDetail.queryOptions({ orderId })
				);
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const regenerateMutation = useMutation(
		trpc.orders.regenerateDiagnosis.mutationOptions({
			onSuccess: () => {
				toast.success("对照诊断已重新生成");
				queryClient.invalidateQueries(
					trpc.orders.getOrderDetail.queryOptions({ orderId })
				);
			},
			onError: (err) => toast.error(err.message),
		})
	);

	if (detailQuery.isPending) {
		return <p className="p-6 text-center text-muted-foreground">加载中...</p>;
	}
	if (!detailQuery.data) {
		return <p className="p-6 text-center text-destructive">订单不存在</p>;
	}

	const { order, review } = detailQuery.data;
	const pnl = Number(order.pnl ?? 0);

	let pnlClass = "";
	if (pnl > 0) {
		pnlClass = "text-green-600";
	} else if (pnl < 0) {
		pnlClass = "text-red-600";
	}

	const savedOpenReason = order.userOpenReason ?? "";
	const savedCloseReason = order.userCloseReason ?? "";
	const effectiveOpen = openReason || savedOpenReason;
	const effectiveClose = closeReason || savedCloseReason;

	return (
		<div className="mx-auto max-w-2xl space-y-6 p-6">
			<h1 className="font-bold text-2xl">{order.symbol} 订单详情</h1>

			<div className="rounded-lg border p-4">
				<h2 className="mb-3 font-semibold">基础信息</h2>
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div className="text-muted-foreground">方向</div>
					<div>{order.side === "BUY" ? "买入" : "卖出"}</div>
					<div className="text-muted-foreground">成交价</div>
					<div>{Number(order.executedPrice ?? 0).toFixed(6)}</div>
					<div className="text-muted-foreground">成交量</div>
					<div>{order.executedQty ?? "—"}</div>
					<div className="text-muted-foreground">手续费</div>
					<div>
						{order.commission ?? "—"} {order.commissionAsset ?? ""}
					</div>
					<div className="text-muted-foreground">状态</div>
					<div>{order.status}</div>
					{order.pnl !== null && (
						<>
							<div className="text-muted-foreground">盈亏（不含手续费）</div>
							<div className={pnlClass}>
								{pnl > 0 ? "+" : ""}
								{pnl.toFixed(4)} USDT
							</div>
						</>
					)}
				</div>
			</div>

			{review?.basicReview && (
				<div className="rounded-lg border p-4">
					<h2 className="mb-2 font-semibold">AI 基础复盘</h2>
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{review.basicReview}
					</p>
				</div>
			)}

			<NoteSection
				closeReason={closeReason}
				isRegenerating={regenerateMutation.isPending}
				isSaving={saveNoteMutation.isPending}
				onCloseReasonChange={setCloseReason}
				onOpenReasonChange={setOpenReason}
				onRegenerate={() => regenerateMutation.mutate({ orderId })}
				onSave={() =>
					saveNoteMutation.mutate({
						orderId,
						openReason: effectiveOpen,
						closeReason: effectiveClose,
					})
				}
				openReason={openReason}
				savedCloseReason={savedCloseReason}
				savedOpenReason={savedOpenReason}
			/>

			{review?.diagnosisReview ? (
				<div className="rounded-lg border p-4">
					<h2 className="mb-2 font-semibold">AI 对照诊断</h2>
					<p className="whitespace-pre-wrap text-sm leading-relaxed">
						{review.diagnosisReview}
					</p>
				</div>
			) : (
				(effectiveOpen || effectiveClose) && (
					<div className="rounded-lg border border-dashed p-4">
						<p className="text-muted-foreground text-sm">
							填写开仓/平仓理由后，点击"生成对照诊断"获取 AI
							对您决策的个性化分析。
						</p>
					</div>
				)
			)}
		</div>
	);
}
