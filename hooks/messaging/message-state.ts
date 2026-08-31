import type { Message } from "@/domain/messaging/types";
import type { BaseConversationContact } from "./types";

export function mergeConversationMessages(
  remoteMessages: Message[],
  pendingMessages: Message[],
  previousMessages: Message[]
): Message[] {
  const merged = [...remoteMessages];

  for (const pendingMessage of pendingMessages) {
    if (!merged.some((message) => message.id === pendingMessage.id || message.content === pendingMessage.content)) {
      merged.push(pendingMessage);
    }
  }

  for (const previousMessage of previousMessages) {
    if (!merged.some((message) => message.id === previousMessage.id)) {
      merged.push(previousMessage);
    }
  }

  return merged;
}

export function appendMessageIfMissing(messages: Message[], message: Message): Message[] {
  return messages.some((current) => current.id === message.id) ? messages : [...messages, message];
}

export function replaceOptimisticMessage(
  messages: Message[],
  optimisticMessageId: string,
  confirmedMessage: Message
): Message[] {
  return [...messages.filter((message) => message.id !== optimisticMessageId), confirmedMessage];
}

export function removeMessage(messages: Message[], messageId: string): Message[] {
  return messages.filter((message) => message.id !== messageId);
}

export function combineVisibleMessages(loadedMessages: Message[], localMessages: Message[]): Message[] {
  return [...loadedMessages, ...localMessages.filter((local) => !loadedMessages.some((loaded) => loaded.id === local.id))];
}

export function updateContactPreview<TContact extends BaseConversationContact>(
  contacts: TContact[],
  counterpartId: string,
  lastMessage: string,
  lastMessageAt: string,
  getCounterpartIdFromContact: (contact: TContact) => string
): TContact[] {
  return contacts.map((contact) =>
    getCounterpartIdFromContact(contact) === counterpartId
      ? { ...contact, lastMessage, lastMessageAt }
      : contact
  );
}

export function toggleExpandedMessage(messageIds: Set<string>, messageId: string): Set<string> {
  const next = new Set(messageIds);
  if (next.has(messageId)) next.delete(messageId);
  else next.add(messageId);
  return next;
}
