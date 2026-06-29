import { AiChatRepository } from "@/ports/ai-chat-repository";
import { AiJobRequestResult } from "@/domain/messaging/types";

export async function createAiJobRequest(
  repository: AiChatRepository,
  conversationId: string,
  providerId: number
): Promise<AiJobRequestResult> {
  return repository.createJobRequest(conversationId, providerId);
}
