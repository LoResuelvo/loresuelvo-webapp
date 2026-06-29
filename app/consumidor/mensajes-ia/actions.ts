"use server";

import { ApiAiChatRepository } from "@/infrastructure/repositories/api-ai-chat-repository";

export async function createAiConversationAction(content: string, imageFileIds?: string[]) {
  const repo = new ApiAiChatRepository();
  return repo.create(content, imageFileIds);
}

export async function sendAiMessageAction(conversationId: string, content: string, imageFileIds?: string[]) {
  const repo = new ApiAiChatRepository();
  return repo.sendMessage(conversationId, content, imageFileIds);
}

export async function getAiConversationByIdAction(id: string) {
  const repo = new ApiAiChatRepository();
  return repo.getById(id);
}

export async function createAiJobRequestAction(conversationId: string, providerId: number) {
  const repo = new ApiAiChatRepository();
  return repo.createJobRequest(conversationId, providerId);
}
