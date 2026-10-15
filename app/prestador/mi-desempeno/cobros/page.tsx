import { PerformancePage } from "@/components/provider/statistics/PerformancePage";
import { getAuthService } from "@/infrastructure/auth";
import { CollectionClient } from "@/components/provider/collections/CollectionClient";
import { t } from "@/infrastructure/i18n/translations";
import { getProviderCollectionTransactionsAction } from "./transaction-actions";
import { getProviderCollectionsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProviderCollectionPage() {
  const session = await getAuthService().getSession();
  const result = await getProviderCollectionsAction();
  const detail = result.success ? await getProviderCollectionTransactionsAction({ from: result.data.period.from, to: result.data.period.to }) : undefined;
  return (
    <PerformancePage session={session} active="collections" title={t.providerCollections.collections} description={t.providerCollections.description}>
      <CollectionClient initialResult={result} initialDetail={detail} />
    </PerformancePage>
  );
}
