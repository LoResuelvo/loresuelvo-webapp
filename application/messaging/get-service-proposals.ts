import { ServiceProposalRepository } from "@/ports/service-proposal-repository";
import { ServiceProposalSummary } from "@/domain/messaging/types";

export async function getServiceProposals(
  repository: ServiceProposalRepository
): Promise<ServiceProposalSummary[]> {
  return repository.getAll();
}
