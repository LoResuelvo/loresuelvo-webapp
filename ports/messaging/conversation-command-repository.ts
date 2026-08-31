import type { Message } from "@/domain/messaging/types";

export interface CreateConversationCommand {
  counterpartId: number;
  currentUserId: string;
  currentUserRole: "consumer" | "provider";
  content?: string;
  imageFileIds?: string[];
}

export interface SendConversationMessageCommand {
  conversationId: string;
  counterpartId: number;
  currentUserId: string;
  currentUserRole: "consumer" | "provider";
  content?: string;
  imageFileIds?: string[];
}

export interface SendConversationAudioCommand {
  conversationId: string;
  counterpartId: number;
  currentUserId: string;
  currentUserRole: "consumer" | "provider";
  audioFileId: string;
}

export interface CreatedConversation {
  conversationId: string;
  message: Message;
}

export interface ConversationCommandRepository {
  create(command: CreateConversationCommand): Promise<CreatedConversation>;
  sendMessage(command: SendConversationMessageCommand): Promise<Message>;
  sendAudioMessage(command: SendConversationAudioCommand): Promise<Message>;
}
