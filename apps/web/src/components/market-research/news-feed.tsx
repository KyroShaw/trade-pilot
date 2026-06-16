const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5"] as const;

interface NewsItem {
	aiInterpretation: string | null;
	id: string;
	publishedAt: Date | string | null;
	source: string | null;
	title: string;
	url: string;
}

interface NewsFeedProps {
	error: string | null;
	isLoading: boolean;
	items: NewsItem[];
}

export function NewsFeed({ items, isLoading, error }: NewsFeedProps) {
	let content: React.ReactNode;

	if (isLoading) {
		content = (
			<div className="space-y-3">
				{SKELETON_KEYS.map((k) => (
					<div className="h-16 animate-pulse rounded-lg bg-muted" key={k} />
				))}
			</div>
		);
	} else if (error) {
		content = (
			<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
				新闻加载失败：{error}
			</div>
		);
	} else if (items.length === 0) {
		content = (
			<div className="rounded-lg border p-8 text-center text-muted-foreground">
				暂无新闻数据
			</div>
		);
	} else {
		content = (
			<div className="space-y-2">
				{items.map((item) => (
					<div className="rounded-lg border p-3" key={item.id}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<a
									className="line-clamp-2 font-medium text-sm hover:underline"
									href={item.url}
									rel="noopener noreferrer"
									target="_blank"
								>
									{item.title}
								</a>
								{item.aiInterpretation && (
									<p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
										💡 {item.aiInterpretation}
									</p>
								)}
							</div>
							{item.source && (
								<span className="shrink-0 text-muted-foreground text-xs">
									{item.source}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div>
			<h2 className="mb-3 font-semibold text-lg">宏观消息面</h2>
			{content}
			{!isLoading && items.length === 0 && !error && (
				<p className="mt-2 text-muted-foreground text-xs">
					请先在设置中配置 LLM API Key 以启用新闻 AI 解读
				</p>
			)}
		</div>
	);
}
