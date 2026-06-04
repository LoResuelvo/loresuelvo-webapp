import { api } from "@/lib/api/base-client";
import { ProviderHomeDashboard } from "./types";

export interface WorkRequest {
  id: string;
  clientName: string;
  problemTitle: string;
  category: string;
  description: string;
  location: string;
  publishedAtLabel: string;
  unreadMessagesCount: number;
}

interface ApiWorkRequest {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  requester: {
    name: string;
    surname: string;
  };
}

function transformApiWorkRequest(apiRequest: ApiWorkRequest): WorkRequest {
  return {
    id: String(apiRequest.id),
    conversationId: String(apiRequest.conversation_id),
    clientName: `${apiRequest.requester.name} ${apiRequest.requester.surname}`,
    problemTitle: apiRequest.title,
    category: "",
    description: apiRequest.description,
    location: "",
    publishedAtLabel: "Ahora",
    unreadMessagesCount: 0,
  };
}

export async function acceptWorkRequest(workRequestId: string): Promise<void> {
  await api.post(`/job-requests/${workRequestId}/accept`, {});
}

export class ApiProviderHomeRepository {
  async getDashboard(_providerId: string): Promise<ProviderHomeDashboard> {
    const response = await api.get<ApiWorkRequest[]>("/job-requests");

    const workRequests = Array.isArray(response) 
      ? response.map(transformApiWorkRequest)
      : [];

    return {
      workRequests,
      scheduledJobs: [],
      metrics: {
        incomeLabel: "$0",
        jobsCompletedCount: 0,
        ratingLabel: "0.0",
      },
    };
  }
}