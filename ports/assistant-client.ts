export interface AssistantClient {
  requestReply(userMessage: string): Promise<string>;
  getConversation(conversationId: string): Promise<{
    id: string;
    title: string;
    messages: Array<{
      id: string;
      content: string;
      senderRole: "consumer" | "chatbot";
      sentAt: string;
    }>;
  }>;
}
