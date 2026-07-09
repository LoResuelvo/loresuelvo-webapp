import { ServiceProposal, CreateServiceProposalInput } from "@/domain/messaging/types";

export interface ServiceProposalRepository {
  create(data: CreateServiceProposalInput): Promise<ServiceProposal>;
}
