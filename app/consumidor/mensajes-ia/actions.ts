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
  try {
    const repo = new ApiAiChatRepository();
    return await repo.createJobRequest(conversationId, providerId);
  } catch (error: unknown) {
    const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
    const msg = error instanceof Error ? error.message : "";
    const bodyObj = errObj && typeof errObj.body === "object" ? (errObj.body as Record<string, unknown>) : null;
    const bodyError = typeof bodyObj?.error === "string" ? bodyObj.error : "";
    if (errObj?.status === 409 || msg.includes("409") || bodyError.includes("Ya existe")) {
      return { status: 409, error: "Ya existe una solicitud de trabajo abierta" } as unknown as {
        id: number;
        conversationId: number;
        title: string;
        description: string;
      };
    }
    throw error;
  }
}

export async function getAiConversationsAction() {
  const repo = new ApiAiChatRepository();
  return repo.getConversations();
}
