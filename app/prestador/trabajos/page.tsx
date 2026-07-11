import { getAuthService } from "@/infrastructure/auth";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import ProviderHeader from "@/components/provider/home/ProviderHeader";
import ProviderSidebar from "@/components/provider/home/ProviderSidebar";
import { ProposalHistoryView } from "@/components/shared/ProposalHistoryView";
import { ServiceProposalSummary } from "@/domain/messaging/types";

export default async function ProviderJobsPage() {
  const session = await getAuthService().getSession();
  
  let proposals: ServiceProposalSummary[] = [];
  try {
    proposals = await getServiceProposalsAction();
  } catch (error) {
    console.error("E2E_DEBUG Failed to fetch proposals", error);
  }

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <ProviderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} />
        <main className="flex-1 p-8 lg:p-10">
          <ProposalHistoryView proposals={proposals} isProvider={true} />
        </main>
      </div>
    </div>
  );
}
