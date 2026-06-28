export interface WsEventMessage {
  id: number;
  sender_role: "consumer" | "provider";
  content: string;
  created_on: string;
  images?: { id: number; url: string; original_name: string }[];
}

export interface WsEvent {
  type: "conversation.message.created";
  conversation_id: number;
  message: WsEventMessage;
}

export type WsMessageHandler = (event: WsEvent) => void;
