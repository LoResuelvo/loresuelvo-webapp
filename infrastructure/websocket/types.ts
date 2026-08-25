import { ApiMessageAudio, ApiMessageImage } from "@/infrastructure/api/types";

export interface WsEventMessage {
  id: number;
  sender_role: "consumer" | "provider";
  content?: string;
  created_on: string;
  images?: ApiMessageImage[];
  audio?: ApiMessageAudio;
}

export interface WsEvent {
  type: "conversation.message.created";
  conversation_id: number;
  message: WsEventMessage;
}

export type WsMessageHandler = (event: WsEvent) => void;
