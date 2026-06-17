import { api } from "@/infrastructure/api/base-client";
import {
  CreateJobRequestInput,
  JobRequestResult,
  JobRequestSummary,
  JobRequestRepository
} from "@/ports/job-request-repository";

interface ApiJobRequestPayload {
  provider_id: number;
  title: string;
  description: string;
}

interface ApiJobRequestResponse {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
}

interface ApiJobRequestSummary {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  requester: { name: string; surname: string; };
}

export class ApiJobRequestRepository implements JobRequestRepository {
  async create(data: CreateJobRequestInput): Promise<JobRequestResult> {
    const payload: ApiJobRequestPayload = {
      provider_id: data.providerId,
      title: data.title,
      description: data.description,
    };
    const res = await api.post<ApiJobRequestResponse>("/job-requests", payload);
    return { id: res.id, conversationId: res.conversation_id, title: res.title, description: res.description };
  }

  async accept(id: number): Promise<void> {
    return api.post<void>(`/job-requests/${id}/accept`, null);
  }

  async list(): Promise<JobRequestSummary[]> {
    const data = await api.get<ApiJobRequestSummary[]>("/job-requests");
    return data.map((item) => ({
      id: item.id,
      conversationId: item.conversation_id,
      title: item.title,
      description: item.description,
      requester: item.requester,
    }));
  }
}
