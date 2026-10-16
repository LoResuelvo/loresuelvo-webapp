import {
  ApiMessageAudio,
  ApiMessageImage,
  ApiNotificationCreatedEvent,
} from "@/infrastructure/api/types";

export interface WsEventMessage {
  id: number;
  sender_role: "consumer" | "provider";
  content?: string;
  created_on: string;
  images?: ApiMessageImage[];
  audio?: ApiMessageAudio;
}

export interface WsConversationMessageEvent {
  type: "conversation.message.created";
  conversation_id: number;
  message: WsEventMessage;
}

export type WsNotificationCreatedEvent = ApiNotificationCreatedEvent;

export type WsEvent = WsConversationMessageEvent | WsNotificationCreatedEvent;

export type WsMessageHandler = (event: WsEvent) => void;
