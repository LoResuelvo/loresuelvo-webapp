import { Message } from "@/domain/messaging/types";

export interface OfflineQueueRepository {
  savePendingMessages(conversationId: string, messages: Message[]): void;
  loadPendingMessages(conversationId: string): Message[];
  clearPendingMessages(conversationId: string): void;
}
