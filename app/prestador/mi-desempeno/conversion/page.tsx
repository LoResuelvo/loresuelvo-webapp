import { PerformancePage } from "@/components/provider/statistics/PerformancePage";
import { getAuthService } from "@/infrastructure/auth";
import { ConversionClient } from "@/components/provider/conversion/ConversionClient";
import { t } from "@/infrastructure/i18n/translations";
import { getProviderConversionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProviderConversionPage() {
  const session = await getAuthService().getSession();
  const result = await getProviderConversionAction();
  return (
    <PerformancePage session={session} active="conversion" title={t.providerConversion.conversion} description={t.providerConversion.description}>
      <ConversionClient initialResult={result} />
    </PerformancePage>
  );
}
