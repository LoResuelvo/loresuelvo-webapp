import { getAuthService } from "@/infrastructure/auth";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import Sidebar from "@/components/consumer/Sidebar";
import { ProposalHistoryView } from "@/components/shared/ProposalHistoryView";
import { ServiceProposalSummary } from "@/domain/messaging/types";

export default async function ConsumerServicesPage() {
  const session = await getAuthService().getSession();

  let proposals: ServiceProposalSummary[] = [];
  try {
    proposals = await getServiceProposalsAction();
  } catch (error) {
    console.error("Failed to fetch proposals", error);
  }

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-8 lg:p-10">
          <ProposalHistoryView proposals={proposals} isProvider={false} />
        </main>
      </div>
    </div>
  );
}
