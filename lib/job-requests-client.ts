import { api } from "@/lib/api/base-client";

export interface CreateJobRequestPayload {
  provider_id: number;
  title: string;
  description: string;
}

export interface JobRequestResponse {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
}

export interface JobRequestSummary {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  requester: {
    name: string;
    surname: string;
  };
}

class JobRequestsClient {
  async createJobRequest(data: CreateJobRequestPayload): Promise<JobRequestResponse> {
    return api.post<JobRequestResponse>("/job-requests", data);
  }

  async acceptJobRequest(id: number): Promise<void> {
    return api.post<void>(`/job-requests/${id}/accept`, null);
  }

  async listJobRequests(): Promise<JobRequestSummary[]> {
    return api.get<JobRequestSummary[]>("/job-requests");
  }
}

export const jobRequestsClient = new JobRequestsClient();
