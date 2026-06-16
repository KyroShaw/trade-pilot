import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@trade-pilot/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@trade-pilot/ui/components/dialog";
import { Input } from "@trade-pilot/ui/components/input";
import { Label } from "@trade-pilot/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

function buttonLabel(isPending: boolean, confirmed: boolean): string {
	if (isPending) {
		return "下单中...";
	}
	if (confirmed) {
		return "确认下单";
	}
	return "预览下单";
}

interface PlaceOrderDialogProps {
	alphaSignalId?: string;
	binancePair: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	projectName: string;
}

export function PlaceOrderDialog({
	alphaSignalId,
	binancePair,
	onOpenChange,
	open,
	projectName,
}: PlaceOrderDialogProps) {
	const navigate = useNavigate();
	const [amount, setAmount] = useState("100");
	const [confirmed, setConfirmed] = useState(false);

	const statusQuery = trpc.trading.getApiKeyStatus.queryOptions();

	const placeOrderMutation = useMutation(
		trpc.trading.placeOrder.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`下单成功，订单 ID: ${data.order?.binanceOrderId ?? "N/A"}`
				);
				queryClient.invalidateQueries(
					trpc.trading.getMyOrders.queryOptions({ limit: 20, offset: 0 })
				);
				onOpenChange(false);
				setConfirmed(false);
				setAmount("100");
			},
			onError: (err) => {
				toast.error(`下单失败：${err.message}`);
				setConfirmed(false);
			},
		})
	);

	const apiKeyStatus = queryClient.getQueryData(statusQuery.queryKey) as
		| { bound: boolean }
		| undefined;

	const handleConfirm = () => {
		if (!confirmed) {
			setConfirmed(true);
			return;
		}

		const qty = Number(amount);
		if (!qty || qty <= 0) {
			toast.error("请输入有效的下单金额");
			return;
		}

		placeOrderMutation.mutate({
			alphaSignalId,
			quoteQtyUsdt: qty,
			symbol: binancePair,
		});
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			setConfirmed(false);
			setAmount("100");
		}
		onOpenChange(nextOpen);
	};

	if (apiKeyStatus && !apiKeyStatus.bound) {
		return (
			<Dialog onOpenChange={handleOpenChange} open={open}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>未绑定 Binance API Key</DialogTitle>
						<DialogDescription>
							请先在设置页绑定 Binance API Key，才能执行下单操作。
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => {
								onOpenChange(false);
								navigate({ to: "/settings" });
							}}
						>
							前往设置
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>下单 — {projectName}</DialogTitle>
					<DialogDescription>现货市价买入 {binancePair}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1">
						<Label htmlFor="amount">下单金额（USDT）</Label>
						<Input
							id="amount"
							min="1"
							onChange={(e) => setAmount(e.target.value)}
							placeholder="100"
							type="number"
							value={amount}
						/>
					</div>

					<div className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900">
						<div className="flex justify-between">
							<span className="text-muted-foreground">标的</span>
							<span className="font-medium">{binancePair}</span>
						</div>
						<div className="mt-1 flex justify-between">
							<span className="text-muted-foreground">方向</span>
							<span className="font-medium text-green-600">市价买入</span>
						</div>
						<div className="mt-1 flex justify-between">
							<span className="text-muted-foreground">金额</span>
							<span className="font-medium">{amount} USDT</span>
						</div>
					</div>

					{confirmed && (
						<div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
							⚠️
							此操作使用真实资金，所有交易由您自行负责，本产品不承担任何投资损失。点击"确认下单"即表示您已知悉并同意。
						</div>
					)}
				</div>

				<DialogFooter>
					<Button onClick={() => handleOpenChange(false)} variant="outline">
						取消
					</Button>
					<Button
						disabled={
							placeOrderMutation.isPending || !amount || Number(amount) <= 0
						}
						onClick={handleConfirm}
					>
						{buttonLabel(placeOrderMutation.isPending, confirmed)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
