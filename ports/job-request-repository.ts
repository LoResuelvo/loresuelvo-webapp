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

export interface JobRequestRepository {
  create(data: CreateJobRequestPayload): Promise<JobRequestResponse>;
  accept(id: number): Promise<void>;
  list(): Promise<JobRequestSummary[]>;
}
