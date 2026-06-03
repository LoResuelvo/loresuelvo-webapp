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

class JobRequestsClient {
  async createJobRequest(data: CreateJobRequestPayload): Promise<JobRequestResponse> {
    return api.post<JobRequestResponse>("/job-requests", data);
  }
}

export const jobRequestsClient = new JobRequestsClient();
