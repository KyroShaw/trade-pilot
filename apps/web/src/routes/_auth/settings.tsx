import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@trade-pilot/ui/components/button";
import { Input } from "@trade-pilot/ui/components/input";
import { Label } from "@trade-pilot/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const statusQuery = useQuery(trpc.trading.getApiKeyStatus.queryOptions());
	const [apiKey, setApiKey] = useState("");
	const [secret, setSecret] = useState("");

	const bindMutation = useMutation(
		trpc.trading.bindApiKey.mutationOptions({
			onSuccess: () => {
				toast.success("API Key 绑定成功");
				setApiKey("");
				setSecret("");
				queryClient.invalidateQueries(
					trpc.trading.getApiKeyStatus.queryOptions()
				);
			},
			onError: (err) => {
				toast.error(err.message);
			},
		})
	);

	const removeMutation = useMutation(
		trpc.trading.removeApiKey.mutationOptions({
			onSuccess: () => {
				toast.success("已解除 API Key 绑定");
				queryClient.invalidateQueries(
					trpc.trading.getApiKeyStatus.queryOptions()
				);
			},
			onError: (err) => {
				toast.error(err.message);
			},
		})
	);

	const handleBind = (e: React.FormEvent) => {
		e.preventDefault();
		if (!(apiKey && secret)) {
			return;
		}
		bindMutation.mutate({ apiKey, secret });
	};

	const status = statusQuery.data;

	return (
		<div className="mx-auto max-w-lg p-6">
			<h1 className="mb-6 font-bold text-2xl">设置</h1>

			<div className="rounded-lg border p-6">
				<h2 className="mb-4 font-semibold text-lg">Binance API Key</h2>

				{status?.bound ? (
					<div className="space-y-4">
						<div className="rounded-md bg-green-50 p-4 dark:bg-green-950">
							<p className="font-medium text-green-800 text-sm dark:text-green-200">
								已绑定（末4位：****{status.keyHint}）
							</p>
							{status.hasTradePermission === false && (
								<p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
									⚠️ 该 Key 缺少现货交易权限，请在 Binance 中开启
								</p>
							)}
						</div>
						<Button
							className="w-full"
							disabled={removeMutation.isPending}
							onClick={() => removeMutation.mutate()}
							variant="destructive"
						>
							{removeMutation.isPending ? "解绑中..." : "解除绑定"}
						</Button>
					</div>
				) : (
					<form className="space-y-4" onSubmit={handleBind}>
						<div className="space-y-1">
							<Label htmlFor="apiKey">API Key</Label>
							<Input
								id="apiKey"
								onChange={(e) => setApiKey(e.target.value)}
								placeholder="请输入 Binance API Key"
								type="password"
								value={apiKey}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="secret">Secret Key</Label>
							<Input
								id="secret"
								onChange={(e) => setSecret(e.target.value)}
								placeholder="请输入 Binance Secret Key"
								type="password"
								value={secret}
							/>
						</div>
						<Button
							className="w-full"
							disabled={bindMutation.isPending || !apiKey || !secret}
							type="submit"
						>
							{bindMutation.isPending ? "验证中..." : "绑定 API Key"}
						</Button>
					</form>
				)}

				<div className="mt-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
					<p className="font-semibold">⚠️ 风险声明</p>
					<p className="mt-1">
						此操作使用真实资金，所有交易由您自行负责，本产品不承担任何投资损失。
						请勿开启提现权限，仅需"现货交易"权限即可。
					</p>
				</div>
			</div>
		</div>
	);
}
