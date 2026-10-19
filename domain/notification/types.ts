export type RealtimeNotificationType =
  | "job_request_received"
  | "service_proposal_received"
  | "service_proposal_accepted"
  | "service_proposal_rejected"
  | "work_order_completion_reported"
  | "work_order_final_payment_approved"
  | "work_order_close_to_scheduled_time"
  | "calendar_reauthorization_required";

export type RealtimeResourceType =
  | "job_request"
  | "service_proposal"
  | "work_order"
  | "calendar_connection";

export interface RealtimeJobRequester {
  name: string;
  surname: string;
}

export interface RealtimeJobRequestImage {
  id: string;
  originalName: string;
  url: string;
}

export interface RealtimeJobRequestPayload {
  id: number;
  conversationId: number;
  title: string;
  description: string;
  status: string;
  requester: RealtimeJobRequester;
  images: RealtimeJobRequestImage[];
}

export interface RealtimeNotification {
  id: number;
  userId: number;
  type: RealtimeNotificationType;
  resourceType: RealtimeResourceType;
  resourceId: number;
  estimatedDurationMinutes?: number;
  readAt?: string | null;
  createdAt: string;
}

export interface RealtimeNotificationEvent {
  type: "notification.created";
  notification: RealtimeNotification;
  jobRequest?: RealtimeJobRequestPayload;
}
