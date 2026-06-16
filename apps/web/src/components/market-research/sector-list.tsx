import { cn } from "@trade-pilot/ui/lib/utils";

const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5"] as const;

interface Token {
	name: string;
	priceChange24h: number;
	symbol: string;
	volume: number;
}

interface Sector {
	categoryId: string;
	marketCapChange24h: string | null;
	name: string;
	topTokens: Token[];
}

interface SectorListProps {
	error: string | null;
	isLoading: boolean;
	sectors: Sector[];
}

export function SectorList({ sectors, isLoading, error }: SectorListProps) {
	if (isLoading) {
		return (
			<div className="space-y-3">
				{SKELETON_KEYS.map((k) => (
					<div className="h-20 animate-pulse rounded-lg bg-muted" key={k} />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
				数据加载失败，正在展示缓存数据：{error}
			</div>
		);
	}

	if (sectors.length === 0) {
		return (
			<div className="rounded-lg border p-8 text-center text-muted-foreground">
				暂无板块数据，请稍后刷新
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<h2 className="font-semibold text-lg">板块轮动 Top {sectors.length}</h2>
			{sectors.map((sector) => {
				const change = Number.parseFloat(sector.marketCapChange24h ?? "0");
				const isPositive = change >= 0;
				return (
					<div className="rounded-lg border p-4" key={sector.categoryId}>
						<div className="flex items-start justify-between gap-2">
							<span className="font-medium">{sector.name}</span>
							<span
								className={cn(
									"shrink-0 font-mono text-sm",
									isPositive ? "text-green-500" : "text-red-500"
								)}
							>
								{isPositive ? "+" : ""}
								{change.toFixed(2)}%
							</span>
						</div>
						{sector.topTokens.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-2">
								{sector.topTokens.map((token) => (
									<span
										className={cn(
											"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
											token.priceChange24h >= 0
												? "bg-green-500/10 text-green-600 dark:text-green-400"
												: "bg-red-500/10 text-red-600 dark:text-red-400"
										)}
										key={token.symbol}
									>
										{token.symbol}
										<span>
											{token.priceChange24h >= 0 ? "+" : ""}
											{token.priceChange24h.toFixed(1)}%
										</span>
									</span>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
