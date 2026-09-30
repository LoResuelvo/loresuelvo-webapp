import type { CollectionTransaction } from "@/domain/provider/collection-transactions";
import { t } from "@/infrastructure/i18n/translations";
import { statisticsDate, statisticsMoney } from "../statistics/statistics-format";

export function CollectionTransactionTable({ transactions }: { transactions: readonly CollectionTransaction[] }) {
  const labels = t.providerCollections;
  if (transactions.length === 0) {
    return <div tabIndex={0} role="region" aria-label={labels.transactions} className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500 focus-visible:outline-2 focus-visible:outline-brand-secondary">
      <p>{labels.emptyTransactions}</p>
    </div>;
  }
  return <div tabIndex={0} role="region" aria-label={labels.transactions} className="overflow-auto rounded-xl border bg-white focus-visible:outline-2 focus-visible:outline-brand-secondary">
    <table aria-label={labels.transactions} className="w-full text-sm">
      <thead><tr className="bg-slate-50 text-left">{[labels.verifiedOn, labels.purpose, labels.sellerAmount, labels.proposal, labels.workOrder].map(label => <th scope="col" className="p-3" key={label}>{label}</th>)}</tr></thead>
      <tbody>{transactions.map(transaction => <tr key={transaction.id} className="border-t">
        <th scope="row" className="p-3 text-left font-normal whitespace-nowrap">{statisticsDate(transaction.verifiedOn)}</th>
        <td className="p-3">{labels[transaction.purpose]}</td><td className="p-3 whitespace-nowrap">{statisticsMoney(transaction.sellerAmountCents)}</td>
        <td className="p-3">{transaction.serviceProposalId}</td><td className="p-3">{transaction.workOrderId}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
