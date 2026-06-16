interface Sector {
	aiSummary: string | null;
	name: string;
}

interface SectorInsightProps {
	isLoading: boolean;
	sectors: Sector[];
}

export function SectorInsight({ sectors, isLoading }: SectorInsightProps) {
	const topWithSummary = sectors.slice(0, 3).filter((s) => s.aiSummary);

	let body: React.ReactNode;

	if (isLoading) {
		body = (
			<div className="space-y-2">
				<div className="h-4 animate-pulse rounded bg-muted" />
				<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
			</div>
		);
	} else if (topWithSummary.length > 0) {
		body = (
			<div className="space-y-3">
				{topWithSummary.map((sector) => (
					<div key={sector.name}>
						<p className="mb-1 font-medium text-muted-foreground text-xs">
							{sector.name}
						</p>
						<p className="text-sm leading-relaxed">{sector.aiSummary}</p>
					</div>
				))}
			</div>
		);
	} else {
		body = (
			<p className="text-muted-foreground text-sm">
				{sectors.length === 0
					? "暂无数据"
					: "请先在设置中配置 LLM API Key 以启用 AI 研判"}
			</p>
		);
	}

	return (
		<div className="rounded-lg border p-4">
			<h2 className="mb-3 font-semibold text-lg">AI 板块研判</h2>
			{body}
		</div>
	);
}
