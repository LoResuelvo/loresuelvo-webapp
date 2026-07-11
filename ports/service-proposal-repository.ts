import { ServiceProposal, ServiceProposalSummary, CreateServiceProposalInput } from "@/domain/messaging/types";

export interface ServiceProposalRepository {
  create(data: CreateServiceProposalInput): Promise<ServiceProposal>;
  getAll(): Promise<ServiceProposalSummary[]>;
}
