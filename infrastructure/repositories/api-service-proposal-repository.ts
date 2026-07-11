import { api } from "@/infrastructure/api/base-client";
import { ServiceProposalRepository } from "@/ports/service-proposal-repository";
import { ServiceProposal, ServiceProposalSummary, CreateServiceProposalInput } from "@/domain/messaging/types";
import { ApiServiceProposal, ApiServiceProposalSummary, ApiCreateServiceProposalRequest } from "@/infrastructure/api/types";
import { transformApiToServiceProposal, transformApiToServiceProposalSummary } from "./service-proposal-mapper";

export class ApiServiceProposalRepository implements ServiceProposalRepository {
  async create(data: CreateServiceProposalInput): Promise<ServiceProposal> {
    const payload: ApiCreateServiceProposalRequest = {
      consumer_id: data.consumerId,
      amount: data.amount,
      scheduled_on: data.scheduledOn,
      description: data.description,
    };
    const res = await api.post<ApiServiceProposal>("/service-proposals", payload);
    return transformApiToServiceProposal(res);
  }

  async getAll(): Promise<ServiceProposalSummary[]> {
    const res = await api.get<ApiServiceProposalSummary[]>("/service-proposals");
    if (!Array.isArray(res)) return [];
    return res.map(transformApiToServiceProposalSummary);
  }
}
