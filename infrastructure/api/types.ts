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
}

export interface ApiRecommendedProvider {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  profile_photo_url?: string;
}

export interface ApiAiConversationDetail {
  id: number;
  status: string;
  title?: string;
  response_status?: string;
  diagnosis_completed?: boolean;
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
    recommended_category?: {
      id: number;
      name: string;
    };
    recommended_providers?: ApiRecommendedProvider[];
  };
}
