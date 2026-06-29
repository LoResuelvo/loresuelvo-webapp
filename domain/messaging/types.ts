export interface MessageImage {
  id: string;
  url: string;
  originalName: string;
}

export interface Message {
  id: string;
  content?: string;
  images?: MessageImage[];
  senderId?: string;
  sentAt: string;
}

export interface JobRequestInfo {
  title: string;
  description: string;
  providerName?: string;
  providerSurname?: string;
  providerProfilePhotoUrl?: string;
}

export interface ConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  messages?: Message[];
  profilePhotoUrl?: string;
}

export interface ConsumerConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  messages?: Message[];
  profilePhotoUrl?: string;
}

export interface ProviderConversationContact {
  id: string;
  consumerId: string;
  consumerName: string;
  consumerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  messages?: Message[];
  profilePhotoUrl?: string;
}

export interface ConversationDetailInfo {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    categoryName: string;
    profilePhotoUrl?: string;
  };
  messages: Message[];
  updatedOn: string;
}

export interface AiConversationContact {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
}

export interface RecommendedProvider {
  id: number;
  name: string;
  surname: string;
  categoryName: string;
  profilePhotoUrl?: string;
}

export interface AiConversationDetail {
  id: number;
  status: string;
  title: string;
  responseStatus: string;
  diagnosisCompleted: boolean;
  assessment?: ProblemAssessment;
  recommendedCategory?: {
    id: number;
    name: string;
  };
  messages: AiMessage[];
  recommendedProviders: RecommendedProvider[];
  updatedOn: string;
}

export type AssessmentOutcome = "collecting_information" | "self_service" | "professional_required";

export interface ProblemAssessment {
  outcome: AssessmentOutcome;
  problemCategory?: {
    id: number;
    name: string;
  };
}

export interface AiJobRequestResult {
  id: number;
  conversationId: number;
  title: string;
  description: string;
}

export interface AiMessage {
  id: string;
  senderRole: "consumer" | "chatbot";
  content: string;
  sentAt: string;
  images?: MessageImage[];
}
