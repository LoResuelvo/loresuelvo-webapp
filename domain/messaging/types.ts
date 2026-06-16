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
}

export interface ApiConversationMessage {
  id: number;
  sender_role: string;
  content: string;
  created_on: string;
}

export interface ConversationDetail {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name: string;
  };
  messages: ApiConversationMessage[];
  updated_on: string;
}
