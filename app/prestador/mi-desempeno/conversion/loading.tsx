import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import { PerformanceNavigation } from "@/components/provider/statistics/PerformanceNavigation";
import { ConversionLoading } from "@/components/provider/conversion/ConversionClient";
import { t } from "@/infrastructure/i18n/translations";

export default function ProviderConversionLoading() {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex flex-col md:flex-row text-brand-primary">
      <ProviderSidebar responsive />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={null} />
        <main className="min-w-0 w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-10">
          <header>
            <h1 className="text-3xl font-bold">{t.providerConversion.conversion}</h1>
            <p className="mt-2 text-slate-600">{t.providerConversion.description}</p>
          </header>
          <PerformanceNavigation active="conversion" />
          <ConversionLoading />
        </main>
      </div>
    </div>
  );
}
