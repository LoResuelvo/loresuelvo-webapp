import { OfflineQueueRepository } from "@/ports/offline-queue-repository";
import { Message } from "@/domain/messaging/types";

export class LocalOfflineQueueRepository implements OfflineQueueRepository {
  private getLocalStorageKey(conversationId: string): string {
    return `pending_messages_${conversationId}`;
  }

  savePendingMessages(conversationId: string, messages: Message[]): void {
    try {
      localStorage.setItem(this.getLocalStorageKey(conversationId), JSON.stringify(messages));
    } catch {
      // localStorage might not be available in some environments
    }
  }

  loadPendingMessages(conversationId: string): Message[] {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey(conversationId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  clearPendingMessages(conversationId: string): void {
    try {
      localStorage.removeItem(this.getLocalStorageKey(conversationId));
    } catch {
      // localStorage might not be available
    }
  }
}
