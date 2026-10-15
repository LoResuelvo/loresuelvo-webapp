import { PerformancePage } from "@/components/provider/statistics/PerformancePage";
import { ConversionLoading } from "@/components/provider/conversion/ConversionClient";
import { t } from "@/infrastructure/i18n/translations";

export default function ProviderConversionLoading() {
  return (
    <PerformancePage session={null} active="conversion" title={t.providerConversion.conversion} description={t.providerConversion.description}>
      <ConversionLoading />
    </PerformancePage>
  );
}
