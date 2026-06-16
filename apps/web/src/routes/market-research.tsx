import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { NewsFeed } from "@/components/market-research/news-feed";
import { SectorInsight } from "@/components/market-research/sector-insight";
import { SectorList } from "@/components/market-research/sector-list";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/market-research")({
	component: MarketResearchPage,
});

function MarketResearchPage() {
	const sectorsQuery = useQuery(trpc.marketResearch.getSectors.queryOptions());
	const newsQuery = useQuery(trpc.marketResearch.getNews.queryOptions());
	const lastUpdatedQuery = useQuery(
		trpc.marketResearch.getLastUpdated.queryOptions()
	);

	const lastUpdated = lastUpdatedQuery.data?.sectors
		? new Date(lastUpdatedQuery.data.sectors).toLocaleTimeString()
		: null;

	return (
		<main className="container mx-auto max-w-6xl px-4 py-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">行情调研</h1>
				{lastUpdated && (
					<span className="text-muted-foreground text-sm">
						上次更新：{lastUpdated}
					</span>
				)}
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<SectorList
						error={sectorsQuery.error?.message ?? null}
						isLoading={sectorsQuery.isLoading}
						sectors={sectorsQuery.data ?? []}
					/>
				</div>
				<div>
					<SectorInsight
						isLoading={sectorsQuery.isLoading}
						sectors={sectorsQuery.data ?? []}
					/>
				</div>
			</div>

			<div className="mt-8">
				<NewsFeed
					error={newsQuery.error?.message ?? null}
					isLoading={newsQuery.isLoading}
					items={newsQuery.data ?? []}
				/>
			</div>
		</main>
	);
}
