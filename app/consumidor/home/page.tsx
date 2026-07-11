import { getAuthService } from "@/infrastructure/auth";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";
import { getConsumerHome } from "@/application/consumer/get-consumer-home";
import { ApiCategoryRepository } from "@/infrastructure/repositories/api-category-repository";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { ServiceProposalSummary } from "@/domain/messaging/types";

export default async function ConsumerHomePage() {
  const session = await getAuthService().getSession();

  const categoryRepo = new ApiCategoryRepository();
  const categories = await getConsumerHome(categoryRepo);
  
  let pendingProposals: ServiceProposalSummary[] = [];
  let acceptedProposals: ServiceProposalSummary[] = [];
  
  try {
    const allProposals = await getServiceProposalsAction();
    pendingProposals = allProposals.filter(p => p.status === "pending");
    acceptedProposals = allProposals.filter(p => p.status === "accepted");
  } catch (error) {
    console.error("Failed to fetch service proposals:", error);
  }

  return (
    <ConsumerHome 
      session={session} 
      categories={categories} 
      pendingProposals={pendingProposals}
      acceptedProposals={acceptedProposals}
    />
  );
}

