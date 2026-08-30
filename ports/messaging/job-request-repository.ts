import { MessageImage } from "@/domain/messaging/types";

export interface CreateJobRequestInput {
  providerId: number;
  title: string;
  description: string;
  imageFileIds?: string[];
}

export interface JobRequestResult {
  id: number;
  conversationId: number;
  title: string;
  description: string;
  images: MessageImage[];
}

export interface JobRequestSummary {
  id: number;
  conversationId: number;
  title: string;
  description: string;
  requester: {
    name: string;
    surname: string;
  };
  images: MessageImage[];
}

export interface JobRequestRepository {
  create(data: CreateJobRequestInput): Promise<JobRequestResult>;
  accept(id: number): Promise<void>;
  list(): Promise<JobRequestSummary[]>;
}
