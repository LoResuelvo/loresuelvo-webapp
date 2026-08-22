"use server";

import { ApiAiChatRepository } from "@/infrastructure/repositories/api-ai-chat-repository";
import type { AiConversationDetail, AiConversationContact } from "@/domain/messaging/types";

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number };

export async function createAiConversationAction(content: string, imageFileIds?: string[]): Promise<ActionResult<AiConversationDetail>> {
  try {
    const repo = new ApiAiChatRepository();
    const data = await repo.create(content, imageFileIds);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear la conversación";
    return { success: false, error: message };
  }
}

export async function sendAiMessageAction(conversationId: string, content: string, imageFileIds?: string[]): Promise<ActionResult<AiConversationDetail>> {
  try {
    const repo = new ApiAiChatRepository();
    const data = await repo.sendMessage(conversationId, content, imageFileIds);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al enviar el mensaje";
    return { success: false, error: message };
  }
}

export async function getAiConversationByIdAction(id: string): Promise<ActionResult<AiConversationDetail>> {
  try {
    const repo = new ApiAiChatRepository();
    const data = await repo.getById(id);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener la conversación";
    return { success: false, error: message };
  }
}

export async function createAiJobRequestAction(conversationId: string, providerId: number): Promise<ActionResult<{
  id: number;
  conversationId: number;
  title: string;
  description: string;
}>> {
  try {
    const repo = new ApiAiChatRepository();
    const data = await repo.createJobRequest(conversationId, providerId);
    return { success: true, data };
  } catch (error: unknown) {
    const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
    const msg = error instanceof Error ? error.message : "";
    const bodyObj = errObj && typeof errObj.body === "object" ? (errObj.body as Record<string, unknown>) : null;
    const bodyError = typeof bodyObj?.error === "string" ? bodyErrorHelper(bodyObj.error) : "";
    const status = typeof errObj?.status === "number" ? errObj.status : (msg.includes("409") ? 409 : 500);
    const errorMessage = bodyError || msg || "Error al crear solicitud de trabajo";
    return { success: false, error: errorMessage, statusCode: status };
  }
}

function bodyErrorHelper(val: unknown): string {
  return typeof val === "string" ? val : "";
}

export async function getAiConversationsAction(): Promise<ActionResult<AiConversationContact[]>> {
  try {
    const repo = new ApiAiChatRepository();
    const data = await repo.getConversations();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener conversaciones";
    return { success: false, error: message };
  }
}
