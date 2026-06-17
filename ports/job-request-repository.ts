export interface CreateJobRequestInput {
  providerId: number;
  title: string;
  description: string;
}

export interface JobRequestResult {
  id: number;
  conversationId: number;
  title: string;
  description: string;
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
}

export interface JobRequestRepository {
  create(data: CreateJobRequestInput): Promise<JobRequestResult>;
  accept(id: number): Promise<void>;
  list(): Promise<JobRequestSummary[]>;
}
