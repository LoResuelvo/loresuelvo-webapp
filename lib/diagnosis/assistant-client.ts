import { getAssistantReply } from "./assistant";

export const DEFAULT_ASSISTANT_DELAY_MS = 800;

export interface AssistantClient {
  requestReply(userMessage: string): Promise<string>;
}

export function createMockAssistantClient(
  delayMs: number = DEFAULT_ASSISTANT_DELAY_MS,
  options: { simulateError?: boolean } = {},
): AssistantClient {
  return {
    async requestReply(userMessage: string) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (options.simulateError) {
        throw new Error("Servicio de IA no disponible");
      }
      return getAssistantReply(userMessage);
    },
  };
}
