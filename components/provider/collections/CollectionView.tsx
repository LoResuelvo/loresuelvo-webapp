import type { ProviderCollections } from "@/domain/provider/collections";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsDate, statisticsRange } from "../statistics/statistics-format";
import { CollectionResults } from "./CollectionResults";
import { CollectionEvolution } from "./CollectionEvolution";
import { CollectionComparison } from "./CollectionComparison";
import { CollectionPending } from "./CollectionPending";

export function CollectionView({ collections }: { collections: ProviderCollections }) {
  return <div className="min-w-0 space-y-7">
    <section aria-label={t.providerActivity.period} className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{t.providerActivity.period}</h2>
      <p data-testid="collection-period">{statisticsRange(collections.period.from, collections.period.to)}</p>
      <p className="mt-2 text-xs text-slate-500">{t.providerActivity.calculatedAt} {statisticsDate(collections.calculatedAt)}</p>
    </section>
    <CollectionResults results={collections.results} />
    <CollectionEvolution intervals={collections.evolution} />
    {collections.comparison && <CollectionComparison comparison={collections.comparison} />}
    <CollectionPending pending={collections.currentPending} />
  </div>;
}
