import { api } from "@/infrastructure/api/base-client";
import {
  CreateJobRequestPayload,
  JobRequestResponse,
  JobRequestSummary,
  JobRequestRepository
} from "@/ports/job-request-repository";

export class ApiJobRequestRepository implements JobRequestRepository {
  async create(data: CreateJobRequestPayload): Promise<JobRequestResponse> {
    return api.post<JobRequestResponse>("/job-requests", data);
  }

  async accept(id: number): Promise<void> {
    return api.post<void>(`/job-requests/${id}/accept`, null);
  }

  async list(): Promise<JobRequestSummary[]> {
    return api.get<JobRequestSummary[]>("/job-requests");
  }
}
