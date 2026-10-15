import { PerformancePage } from "@/components/provider/statistics/PerformancePage";
import { ReputationLoading } from "@/components/provider/reputation/ReputationClient";
import { t } from "@/infrastructure/i18n/translations";

export default function ProviderReputationLoading() {
  return (
    <PerformancePage session={null} active="reputation" title={t.providerReputation.reputation} description={t.providerReputation.description}>
      <ReputationLoading />
    </PerformancePage>
  );
}
