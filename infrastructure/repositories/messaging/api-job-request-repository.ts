import { api } from "@/infrastructure/api/base-client";
import type {
  CreateJobRequestInput,
  JobRequestResult,
  JobRequestSummary,
  JobRequestRepository
} from "@/ports/messaging/job-request-repository";
import type {
  ApiJobRequestPayload,
  ApiJobRequestResponse,
  ApiJobRequestSummary,
  ApiServiceAddress,
  ApiMessageImage,
} from "@/infrastructure/api/types";
import type { MessageImage, ServiceAddress } from "@/domain/messaging/types";

const mapApiImages = (images?: ApiMessageImage[]): MessageImage[] => {
  if (!images) return [];
  return images.map((img) => ({
    id: img.id,
    url: img.url,
    originalName: img.original_name,
  }));
};

function mapServiceAddress(address?: ApiServiceAddress | null): ServiceAddress | undefined {
  if (!address) return undefined;
  return {
    street: address.street,
    streetNumber: address.street_number,
    floor: address.floor,
    unit: address.unit,
  };
}

export class ApiJobRequestRepository implements JobRequestRepository {
  async create(data: CreateJobRequestInput): Promise<JobRequestResult> {
    const payload: ApiJobRequestPayload = {
      provider_id: data.providerId,
      title: data.title,
      description: data.description,
      image_file_ids: data.imageFileIds,
    };
    const res = await api.post<ApiJobRequestResponse>("/job-requests", payload);
    const serviceAddress = mapServiceAddress(res.service_address);
    return {
      id: res.id,
      conversationId: res.conversation_id,
      title: res.title,
      description: res.description,
      images: mapApiImages(res.images),
      ...(serviceAddress ? { serviceAddress } : {}),
      ...(res.created_on ? { createdOn: res.created_on } : {}),
    };
  }

  async accept(id: number): Promise<void> {
    return api.post<void>(`/job-requests/${id}/accept`, null);
  }

  async list(): Promise<JobRequestSummary[]> {
    const data = await api.get<ApiJobRequestSummary[]>("/job-requests");
    return data.map((item) => {
      const serviceAddress = mapServiceAddress(item.service_address);
      return {
        id: item.id,
        conversationId: item.conversation_id,
        title: item.title,
        description: item.description,
        requester: item.requester,
        images: mapApiImages(item.images),
        ...(serviceAddress ? { serviceAddress } : {}),
        ...(item.created_on ? { createdOn: item.created_on } : {}),
      };
    });
  }
}
