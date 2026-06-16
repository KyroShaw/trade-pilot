import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@trade-pilot/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@trade-pilot/ui/components/card";
import { useState } from "react";

import { PlaceOrderDialog } from "@/components/place-order-dialog";
import { trpc } from "@/utils/trpc";

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

interface AlphaSignalCardProps {
	signal: AlphaSignal;
}

export function AlphaSignalCard({ signal }: AlphaSignalCardProps) {
	const [reasonExpanded, setReasonExpanded] = useState(false);
	const [orderDialogOpen, setOrderDialogOpen] = useState(false);
	const navigate = useNavigate();
	const apiKeyStatusQuery = useQuery(
		trpc.trading.getApiKeyStatus.queryOptions()
	);

	const drawdownPct = (Number(signal.drawdownFromAth) * 100).toFixed(1);
	const percentilePct = (Number(signal.pricePercentile) * 100).toFixed(0);
	const atrRatio = Number(signal.atrRatio).toFixed(2);

	let aiSection: React.ReactNode;

	if (signal.aiReason) {
		aiSection = (
			<div className="mt-3 border-t pt-3">
				<button
					className="flex w-full items-center justify-between text-left font-medium text-muted-foreground text-sm hover:text-foreground"
					onClick={() => setReasonExpanded((v) => !v)}
					type="button"
				>
					<span>AI 入选理由</span>
					<span>{reasonExpanded ? "▲" : "▼"}</span>
				</button>
				{reasonExpanded && (
					<p className="mt-2 text-sm leading-relaxed">{signal.aiReason}</p>
				)}
			</div>
		);
	} else {
		aiSection = (
			<div className="mt-3 border-t pt-3">
				<p className="text-muted-foreground text-xs">
					配置 LLM API Key 后可查看 AI 入选理由
				</p>
			</div>
		);
	}

	const isBound = apiKeyStatusQuery.data?.bound;

	const handleOrderClick = () => {
		if (isBound === false) {
			navigate({ to: "/settings" });
			return;
		}
		setOrderDialogOpen(true);
	};

	return (
		<>
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-base">{signal.project.name}</CardTitle>
							<p className="text-muted-foreground text-sm">
								{signal.project.binancePair}
							</p>
						</div>
						<span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
							盘整信号
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						<span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400">
							盘整 {signal.consolidationDays} 天
						</span>
						<span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400">
							距 ATH 回撤 {drawdownPct}%
						</span>
						<span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 text-xs dark:bg-purple-900/30 dark:text-purple-400">
							价格低位第 {percentilePct}th 百分位
						</span>
						<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-xs dark:bg-orange-900/30 dark:text-orange-400">
							ATR 收敛 {atrRatio}x
						</span>
					</div>

					{aiSection}

					<div className="mt-3 flex items-center justify-between border-t pt-3">
						<p className="text-muted-foreground text-xs">
							⚠️ 本信号不构成投资建议，请自行评估风险。
						</p>
						<Button onClick={handleOrderClick} size="sm">
							{isBound === false ? "请先绑定 API Key" : "下单"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<PlaceOrderDialog
				alphaSignalId={signal.id}
				binancePair={signal.project.binancePair}
				onOpenChange={setOrderDialogOpen}
				open={orderDialogOpen}
				projectName={signal.project.name}
			/>
		</>
	);
}
