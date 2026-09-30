import type { CollectionPurpose, CollectionTransactions as Detail } from "@/domain/provider/collection-transactions";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsDate, statisticsMoney } from "../statistics/statistics-format";
import { CollectionTransactionTable } from "./CollectionTransactionTable";

export function CollectionTransactions({ detail, purpose, pending, onPurpose, onNextPage }: { detail: Detail; purpose?: CollectionPurpose; pending: boolean; onPurpose: (purpose?: CollectionPurpose) => void; onNextPage?: () => void }) {
  const labels = t.providerCollections;
  return <section aria-labelledby="collection-detail-title" className="space-y-3" aria-busy={pending}>
    <h2 id="collection-detail-title" className="text-xl font-semibold">{labels.detail}</h2>
    <label className="block space-y-1 text-sm">{labels.purpose}<select value={purpose ?? ""} disabled={pending} onChange={event => onPurpose(event.target.value === "booking_deposit" || event.target.value === "service_balance" ? event.target.value : undefined)} className="block w-full sm:max-w-xs rounded-lg border border-slate-300 h-9 px-2 focus-visible:outline-2 focus-visible:outline-brand-secondary">
      <option value="">{labels.allPurposes}</option><option value="booking_deposit">{labels.booking_deposit}</option><option value="service_balance">{labels.service_balance}</option>
    </select></label>
    <p className="text-sm text-slate-600">{labels.detailHelp}</p>
    <p className="text-xs text-slate-500">{t.providerActivity.calculatedAt} {statisticsDate(detail.calculatedAt)}</p>
    <dl className="grid gap-3 sm:grid-cols-2"><div><dt>{labels.totalCount}</dt><dd data-testid="collection-detail-count" className="text-xl font-bold">{detail.totalCount}</dd></div><div><dt>{labels.totalAmount}</dt><dd data-testid="collection-detail-amount" className="text-xl font-bold">{statisticsMoney(detail.totalAmountCents)}</dd></div></dl>
    <CollectionTransactionTable transactions={detail.transactions} />
    {detail.nextCursor && onNextPage && (
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={onNextPage}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-secondary"
        >
          {labels.nextPage}
        </button>
      </div>
    )}
  </section>;
}
