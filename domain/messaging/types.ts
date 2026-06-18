export interface Message {
  id: string;
  content: string;
  senderId?: string;
  sentAt: string;
}

export interface JobRequestInfo {
  title: string;
  description: string;
  providerName?: string;
  providerSurname?: string;
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

export interface AiConversationDetail {
  id: number;
  status: string;
  title: string;
  responseStatus: string;
  messages: AiMessage[];
  updatedOn: string;
}

export interface AiMessage {
  id: string;
  senderRole: "consumer" | "chatbot";
  content: string;
  sentAt: string;
}
