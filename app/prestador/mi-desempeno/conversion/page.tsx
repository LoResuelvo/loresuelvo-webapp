import { getAuthService } from "@/infrastructure/auth";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import { PerformanceNavigation } from "@/components/provider/statistics/PerformanceNavigation";
import { ConversionClient } from "@/components/provider/conversion/ConversionClient";
import { t } from "@/infrastructure/i18n/translations";
import { getProviderConversionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProviderConversionPage() {
  const session = await getAuthService().getSession();
  const result = await getProviderConversionAction();
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex flex-col md:flex-row text-brand-primary">
      <ProviderSidebar responsive />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} />
        <main className="min-w-0 w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-10">
          <header>
            <h1 className="text-3xl font-bold">{t.providerConversion.conversion}</h1>
            <p className="mt-2 text-slate-600">{t.providerConversion.description}</p>
          </header>
          <PerformanceNavigation active="conversion" />
          <ConversionClient initialResult={result} />
        </main>
      </div>
    </div>
  );
}
