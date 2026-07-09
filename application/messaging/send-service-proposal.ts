import { ServiceProposalRepository } from "@/ports/service-proposal-repository";
import { CreateServiceProposalInput, ServiceProposal } from "@/domain/messaging/types";

export async function sendServiceProposal(
  serviceProposalRepository: ServiceProposalRepository,
  input: CreateServiceProposalInput
): Promise<ServiceProposal> {
  return serviceProposalRepository.create(input);
}
