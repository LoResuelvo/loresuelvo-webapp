import type { ProviderCollections } from "@/domain/provider/collections";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsDate, statisticsRange } from "../statistics/statistics-format";
import { CollectionResults } from "./CollectionResults";
import { CollectionEvolution } from "./CollectionEvolution";
import { CollectionComparison } from "./CollectionComparison";
import { CollectionPending } from "./CollectionPending";

export function CollectionView({ collections }: { collections: ProviderCollections }) {
  return <div className="min-w-0 space-y-7">
    <CollectionResults results={collections.results} />
    <section aria-label={t.providerActivity.period} className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2">
      <h2 className="font-semibold text-slate-700">{t.providerActivity.period}</h2>
      <p data-testid="collection-period" className="min-w-0 break-words text-sm text-slate-700">{statisticsRange(collections.period.from, collections.period.to)}</p>
      <p className="text-xs text-slate-600">{t.providerActivity.periodBoundsHelp}</p>
      <p className="text-xs text-slate-500">{t.providerActivity.calculatedAt} {statisticsDate(collections.calculatedAt)}</p>
    </section>
    <CollectionEvolution intervals={collections.evolution} />
    {collections.comparison && <CollectionComparison comparison={collections.comparison} />}
    <CollectionPending pending={collections.currentPending} />
  </div>;
}
