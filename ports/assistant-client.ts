export interface AssistantClient {
  requestReply(userMessage: string): Promise<string>;
}
