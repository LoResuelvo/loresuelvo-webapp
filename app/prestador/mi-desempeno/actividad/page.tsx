import { PerformancePage } from "@/components/provider/statistics/PerformancePage";
import { getAuthService } from "@/infrastructure/auth";
import { ActivityClient } from "@/components/provider/activity/ActivityClient";
import { t } from "@/infrastructure/i18n/translations";
import { getProviderActivityAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProviderActivityPage() {
  const session = await getAuthService().getSession();
  const result = await getProviderActivityAction();
  return (
    <PerformancePage session={session} active="activity" title={t.providerActivity.activity} description={t.providerActivity.description}>
      <ActivityClient initialResult={result} />
    </PerformancePage>
  );
}
