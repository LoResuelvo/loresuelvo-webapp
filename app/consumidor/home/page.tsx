import { getAuthService } from "@/infrastructure/auth";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";
import { getConsumerHome } from "@/application/consumer/get-consumer-home";
import { ApiCategoryRepository } from "@/infrastructure/repositories/consumer/api-category-repository";
import { getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { getCurrentUserAction } from "@/app/api/me/actions";
import { logger } from "@/infrastructure/logging/logger";

export default async function ConsumerHomePage() {
  let session = await getAuthService().getSession();

  try {
    const currentUser = await getCurrentUserAction();
    if (session?.user && currentUser) {
      session = {
        ...session,
        user: {
          ...session.user,
          firstName: currentUser.firstName || session.user.firstName,
          lastName: currentUser.lastName || session.user.lastName,
          profilePhotoUrl: currentUser.profilePhoto?.url ?? session.user.profilePhotoUrl,
          role: currentUser.role || session.user.role,
        },
      };
    }
  } catch {
    // Graceful degradation: fallback to Auth0 session if /me fails
  }

  const categoryRepo = new ApiCategoryRepository();
  const categories = await getConsumerHome(categoryRepo);
  
  let pendingProposals: ServiceProposalSummary[] = [];
  let acceptedProposals: ServiceProposalSummary[] = [];
  
  try {
    const allProposals = await getServiceProposalsAction();
    pendingProposals = allProposals.filter(p => p.status === "pending");
    acceptedProposals = allProposals.filter(p => p.status === "accepted");
  } catch (error) {
    logger.debug("Failed to fetch service proposals:", { error });
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
