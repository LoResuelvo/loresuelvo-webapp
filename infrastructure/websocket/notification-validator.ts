import type {
  ApiNotificationCreatedEvent,
  ApiRealtimeJobRequest,
  ApiRealtimeNotification,
} from "@/infrastructure/api/types";
import type { WsConversationMessageEvent, WsEvent } from "./types";

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function isValidConversationMessageEvent(raw: Record<string, unknown>): raw is Record<string, unknown> & WsConversationMessageEvent {
  if (raw.type !== "conversation.message.created") return false;
  if (typeof raw.conversation_id !== "number") return false;
  if (!isObject(raw.message)) return false;

  const msg = raw.message;
  if (typeof msg.id !== "number") return false;
  if (msg.sender_role !== "consumer" && msg.sender_role !== "provider") return false;
  if (typeof msg.created_on !== "string") return false;

  return true;
}

function isValidRealtimeNotification(raw: unknown): raw is ApiRealtimeNotification {
  if (!isObject(raw)) return false;
  if (typeof raw.id !== "number") return false;
  if (typeof raw.user_id !== "number") return false;
  if (typeof raw.type !== "string" || !raw.type) return false;
  if (typeof raw.resource_type !== "string" || !raw.resource_type) return false;
  if (typeof raw.resource_id !== "number") return false;
  if (typeof raw.created_at !== "string" || !raw.created_at) return false;

  return true;
}

function isValidRealtimeJobRequestImage(raw: unknown): boolean {
  if (!isObject(raw)) return false;
  return (
    typeof raw.id === "string" &&
    typeof raw.original_name === "string" &&
    typeof raw.url === "string"
  );
}

function isValidRealtimeJobRequest(raw: unknown): raw is ApiRealtimeJobRequest {
  if (!isObject(raw)) return false;
  if (typeof raw.id !== "number") return false;
  if (typeof raw.conversation_id !== "number") return false;
  if (typeof raw.title !== "string") return false;
  if (typeof raw.description !== "string") return false;
  if (typeof raw.status !== "string") return false;

  if (!isObject(raw.requester)) return false;
  if (typeof raw.requester.name !== "string" || typeof raw.requester.surname !== "string") {
    return false;
  }

  if (!Array.isArray(raw.images)) return false;
  if (!raw.images.every(isValidRealtimeJobRequestImage)) return false;

  return true;
}

function isValidNotificationCreatedEvent(raw: Record<string, unknown>): raw is Record<string, unknown> & ApiNotificationCreatedEvent {
  if (raw.type !== "notification.created") return false;
  if (!isValidRealtimeNotification(raw.notification)) return false;

  if (raw.job_request !== undefined && !isValidRealtimeJobRequest(raw.job_request)) {
    return false;
  }

  return true;
}

export function validateWsEvent(raw: unknown): WsEvent | null {
  if (!isObject(raw)) return null;

  if (isValidConversationMessageEvent(raw)) {
    return raw as WsConversationMessageEvent;
  }

  if (isValidNotificationCreatedEvent(raw)) {
    return raw as ApiNotificationCreatedEvent;
  }

  return null;
}
