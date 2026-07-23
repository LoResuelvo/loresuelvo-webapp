import { Category } from "@/domain/shared/types";
import { Provider } from "@/domain/provider/types";

export type { Category, Provider };

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiStub {
  method: HttpMethod;
  endpoint: string;
  status: number;
  body: unknown;
}

export interface ApiConversation {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name: string;
    profile_photo_url?: string;
  };
  last_message?: {
    id: number;
    sender_role: string;
    content: string;
    created_on: string;
  };
  updated_on: string;
}

export interface ApiProvider {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  category_id?: number;
  description?: string;
  rating?: number;
  reviews?: number;
  jobs?: number;
  profile_photo_url?: string;
}

export interface ApiMessageImage {
  id: string;
  url: string;
  original_name: string;
}

export interface ApiConversationMessage {
  id: number;
  sender_role: string;
  content?: string;
  images?: ApiMessageImage[];
  created_on: string;
}

export interface ApiConversationDetail {
  id: number;
  type?: string;
  status: string;
  work?: {
    counterpart: {
      id: number;
      role: string;
      name: string;
      surname: string;
      category_name: string;
      profile_photo_url?: string;
    };
  };
  messages: ApiConversationMessage[];
  updated_on: string;
}

export interface ApiAiConversation {
  id: number;
  status: string;
  title: string;
  last_message?: {
    id: number;
    sender_role: string;
    content: string;
    created_on: string;
  };
  updated_on: string;
}

export interface ApiAiConversationMessage {
  id: number;
  sender_role: string;
  content: string;
  created_on: string;
  images?: ApiMessageImage[];
}

export interface ApiRecommendedProvider {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  profile_photo_url?: string;
}

export interface ApiProblemAssessment {
  outcome: string;
  problem_category?: {
    id: number;
    name: string;
  };
}

export interface ApiAiConversationDetail {
  id: number;
  status: string;
  title?: string;
  response_status?: string;
  diagnosis_completed?: boolean;
  assessment?: ApiProblemAssessment;
  recommended_category?: {
    id: number;
    name: string;
  };
  messages: ApiAiConversationMessage[];
  response?: ApiAiConversationMessage;
  recommended_providers?: ApiRecommendedProvider[];
  chatbot?: {
    title: string;
    response_status: string;
    diagnosis_completed?: boolean;
    assessment?: ApiProblemAssessment;
    recommended_category?: {
      id: number;
      name: string;
    };
    recommended_providers?: ApiRecommendedProvider[];
  };
}

export interface ApiCreateServiceProposalRequest {
  consumer_id: number;
  amount: string;
  scheduled_on: string;
  description: string;
}

export interface ApiServiceProposal {
  id: number;
  conversation_id: number;
  consumer_id: number;
  provider_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  status: string;
}

export interface ApiServiceProposalCounterpart {
  id: number;
  role: string;
  name: string;
  surname: string;
  category_name?: string;
  profile_photo_url?: string;
}

export interface ApiServiceProposalSummary {
  id: number;
  conversation_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  status: string;
  created_on: string;
  counterpart: ApiServiceProposalCounterpart;
}

export interface ApiPaymentAccountConnection {
  status: string;
  account_id?: string;
  can_receive_payments: boolean;
  can_send_service_proposals: boolean;
}

export interface ApiPaymentAccountAuthorization {
  authorization_url: string;
  state: string;
}

export interface ApiRegisterConsumerResponse {
  id: number;
  name: string;
  surname: string;
  profile_photo_url?: string;
}

export interface ApiCurrentUserProfilePhoto {
  original_name: string;
  url: string;
}

export interface ApiCurrentUserCategory {
  id: number;
  name: string;
}

export interface ApiCurrentUserResponse {
  id: number;
  name: string;
  surname: string;
  email: string;
  role: "consumer" | "provider";
  profile_photo?: ApiCurrentUserProfilePhoto | null;
}

export type ApiConsumerCurrentUserResponse = ApiCurrentUserResponse;

export interface ApiProviderCurrentUserResponse extends ApiCurrentUserResponse {
  category: ApiCurrentUserCategory;
}


