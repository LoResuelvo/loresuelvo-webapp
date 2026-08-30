import { api } from "@/infrastructure/api/base-client";
import { ProviderHomeDashboard, ProviderWorkRequest } from "@/domain/provider/types";
import { ProviderHomeRepository } from "@/ports/provider-home-repository";

import { ApiMessageImage } from "@/infrastructure/api/types";

interface ApiWorkRequest {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  requester: {
    name: string;
    surname: string;
  };
  images?: ApiMessageImage[];
}

function transformApiWorkRequest(apiRequest: ApiWorkRequest): ProviderWorkRequest {
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
    images: apiRequest.images
      ? apiRequest.images.map((img) => ({
          id: img.id,
          url: img.url,
          originalName: img.original_name,
        }))
      : [],
  };
}

export async function acceptWorkRequest(workRequestId: string): Promise<void> {
  await api.post(`/job-requests/${workRequestId}/accept`, {});
}

export class ApiProviderHomeRepository implements ProviderHomeRepository {
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
