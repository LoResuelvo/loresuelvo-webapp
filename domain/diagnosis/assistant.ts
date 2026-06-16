export const MOCK_ASSISTANT_REPLY =
  "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?";

export function getAssistantReply(userMessage: string): string {
  if (!userMessage.trim()) return "";
  return MOCK_ASSISTANT_REPLY;
}
