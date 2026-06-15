export interface AiMessage {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
}

const AI_CHAT_KEY = "ai_chat_messages";

export function saveAiMessages(messages: AiMessage[]): void {
  try {
    localStorage.setItem(AI_CHAT_KEY, JSON.stringify(messages));
  } catch {
    // localStorage not available
  }
}

export function loadAiMessages(): AiMessage[] {
  try {
    const stored = localStorage.getItem(AI_CHAT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearAiMessages(): void {
  try {
    localStorage.removeItem(AI_CHAT_KEY);
  } catch {
    // localStorage not available
  }
}

export function addAiMessage(messages: AiMessage[], message: AiMessage): AiMessage[] {
  return [...messages, message];
}
