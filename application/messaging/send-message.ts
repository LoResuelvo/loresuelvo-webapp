import {
  ConversationCommandRepository,
  CreateConversationCommand,
  CreatedConversation,
  SendConversationMessageCommand,
} from "@/ports/messaging/conversation-command-repository";
import { Message } from "@/domain/messaging/types";

export async function createConversation(
  conversationRepository: ConversationCommandRepository,
  command: CreateConversationCommand
): Promise<CreatedConversation> {
  return conversationRepository.create(command);
}

export async function sendMessage(
  conversationRepository: ConversationCommandRepository,
  command: SendConversationMessageCommand
): Promise<Message> {
  return conversationRepository.sendMessage(command);
}
