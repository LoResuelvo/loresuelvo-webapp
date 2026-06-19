"use server";

import { ApiAiChatRepository } from "@/infrastructure/repositories/api-ai-chat-repository";

export async function createAiConversationAction(content: string) {
  const repo = new ApiAiChatRepository();
  return repo.create(content);
}

export async function sendAiMessageAction(conversationId: string, content: string) {
  const repo = new ApiAiChatRepository();
  return repo.sendMessage(conversationId, content);
}

export async function getAiConversationByIdAction(id: string) {
  const repo = new ApiAiChatRepository();
  return repo.getById(id);
}
