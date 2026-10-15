import { PerformancePage } from "@/components/provider/statistics/PerformancePage";
import { getAuthService } from "@/infrastructure/auth";
import { ReputationClient } from "@/components/provider/reputation/ReputationClient";
import { t } from "@/infrastructure/i18n/translations";
import { getProviderReputationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProviderReputationPage() {
  const session = await getAuthService().getSession();
  const result = await getProviderReputationAction();
  return (
    <PerformancePage session={session} active="reputation" title={t.providerReputation.reputation} description={t.providerReputation.description}>
      <ReputationClient initialResult={result} />
    </PerformancePage>
  );
}
