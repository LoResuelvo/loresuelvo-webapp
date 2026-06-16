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

/**
 * Generic representation of a conversation contact used by shared UI components.
 * By convention, it uses 'providerId' to identify the counterpart.
 */
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

/**
 * Consumer-side representation of a contact. The counterpart is a Provider.
 */
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

/**
 * Provider-side representation of a contact. The counterpart is a Consumer.
 */
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
