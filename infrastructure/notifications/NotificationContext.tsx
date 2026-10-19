"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useWebSocket } from "@/infrastructure/websocket";
import type {
  RealtimeJobRequestPayload,
  RealtimeNotification,
  RealtimeNotificationType,
  RealtimeResourceType,
} from "@/domain/notification/types";
import type { WsEvent, WsNotificationCreatedEvent } from "@/infrastructure/websocket/types";
import { t } from "@/infrastructure/i18n/translations";
import { useCalendarAuthorization } from "@/components/profile/useCalendarAuthorization";

export interface ActionableNotice {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  description: string;
  actionLabel?: string;
  resourceType: RealtimeResourceType;
  resourceId: number;
  actionError?: string | null;
  isActionPending?: boolean;
  onAction?: () => void | Promise<void>;
}

export type ResourceListener = (
  event: RealtimeNotification,
  jobRequest?: RealtimeJobRequestPayload
) => void;

interface NotificationContextValue {
  notices: ActionableNotice[];
  dismissNotice: (id: string) => void;
  subscribeResource: (
    resourceType: RealtimeResourceType,
    resourceId: number | undefined,
    callback: ResourceListener
  ) => () => void;
  activeModalWorkOrderId: number | null;
  openWorkOrderDetail: (id: number) => void;
  closeWorkOrderDetail: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}

export function useResourceUpdate(
  resourceType: RealtimeResourceType,
  resourceId: number | undefined,
  onUpdate: ResourceListener,
  debounceMs: number = 100
) {
  const ctx = useContext(NotificationContext);
  const subscribeResource = ctx?.subscribeResource;
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingEventsRef = useRef<Array<[RealtimeNotification, RealtimeJobRequestPayload | undefined]>>([]);

  useEffect(() => {
    if (!subscribeResource) return;
    const unsubscribe = subscribeResource(resourceType, resourceId, (event, jobRequest) => {
      pendingEventsRef.current.push([event, jobRequest]);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const pendingEvents = pendingEventsRef.current;
        pendingEventsRef.current = [];
        timerRef.current = undefined;
        pendingEvents.forEach(([pendingEvent, pendingJobRequest]) => {
          try {
            callbackRef.current(pendingEvent, pendingJobRequest);
          } catch (error) {
            console.error("Resource update callback error:", error);
          }
        });
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = undefined;
      pendingEventsRef.current = [];
    };
  }, [subscribeResource, resourceType, resourceId, debounceMs]);
}

interface NotificationProviderProps {
  children: ReactNode;
  role?: string;
}

interface ResourceSubscription {
  resourceType: RealtimeResourceType;
  resourceId?: number;
  callback: ResourceListener;
}

type NotificationCreatedEvent = Extract<WsEvent, { type: "notification.created" }>;

function getDeduplicationKey(notice: WsNotificationCreatedEvent["notification"]): string {
  if (notice.id > 0) {
    return `id:${notice.id}`;
  }
  return `${notice.user_id}:${notice.type}:${notice.resource_type}:${notice.resource_id}`;
}

function rememberEvent(eventKey: string, seenEvents: Set<string>): boolean {
  if (seenEvents.has(eventKey)) return false;
  seenEvents.add(eventKey);

  if (seenEvents.size > 200) {
    const oldestEventKey = seenEvents.values().next().value;
    if (oldestEventKey) seenEvents.delete(oldestEventKey);
  }
  return true;
}

function mapNotificationEvent(event: NotificationCreatedEvent) {
  const rawNotice = event.notification;
  const notification: RealtimeNotification = {
    id: rawNotice.id,
    userId: rawNotice.user_id,
    type: rawNotice.type as RealtimeNotificationType,
    resourceType: rawNotice.resource_type as RealtimeResourceType,
    resourceId: rawNotice.resource_id,
    estimatedDurationMinutes: rawNotice.estimated_duration_minutes,
    readAt: rawNotice.read_at,
    createdAt: rawNotice.created_at,
  };

  const jobRequest: RealtimeJobRequestPayload | undefined = event.job_request
    ? {
        id: event.job_request.id,
        conversationId: event.job_request.conversation_id,
        title: event.job_request.title,
        description: event.job_request.description,
        status: event.job_request.status,
        requester: {
          name: event.job_request.requester.name,
          surname: event.job_request.requester.surname,
        },
        images: event.job_request.images.map((image) => ({
          id: image.id,
          originalName: image.original_name,
          url: image.url,
        })),
      }
    : undefined;

  return { notification, jobRequest };
}

function dispatchResourceEvent(
  listeners: Set<ResourceSubscription>,
  notification: RealtimeNotification,
  jobRequest: RealtimeJobRequestPayload | undefined
) {
  listeners.forEach(({ resourceType, resourceId, callback }) => {
    if (resourceType !== notification.resourceType) return;
    if (resourceId !== undefined && resourceId !== notification.resourceId) return;

    try {
      callback(notification, jobRequest);
    } catch (error) {
      console.error("Resource listener error:", error);
    }
  });
}

interface NoticeActions {
  dismissNotice: (id: string) => void;
  openWorkOrderDetail: (id: number) => void;
  startAuthorization: () => Promise<boolean>;
}

function createActionableNotice(
  notification: RealtimeNotification,
  eventKey: string,
  actions: NoticeActions
): ActionableNotice | null {
  if (notification.type === "work_order_close_to_scheduled_time") {
    const orderId = notification.resourceId;
    return {
      id: eventKey,
      type: notification.type,
      title: t.notifications.workOrderCloseToScheduledTime.title,
      description: t.notifications.workOrderCloseToScheduledTime.description,
      actionLabel: t.notifications.workOrderCloseToScheduledTime.action,
      resourceType: "work_order",
      resourceId: orderId,
      onAction: () => {
        actions.openWorkOrderDetail(orderId);
        actions.dismissNotice(eventKey);
      },
    };
  }

  if (notification.type === "calendar_reauthorization_required") {
    return {
      id: eventKey,
      type: notification.type,
      title: t.notifications.calendarReauthorizationRequired.title,
      description: t.notifications.calendarReauthorizationRequired.description,
      actionLabel: t.notifications.calendarReauthorizationRequired.action,
      resourceType: "calendar_connection",
      resourceId: notification.resourceId,
      onAction: async () => {
        const started = await actions.startAuthorization();
        if (started) actions.dismissNotice(eventKey);
      },
    };
  }

  return null;
}

function enqueueActionableNotice(
  notice: ActionableNotice | null,
  setNotices: Dispatch<SetStateAction<ActionableNotice[]>>
) {
  if (!notice) return;
  setNotices((previousNotices) =>
    previousNotices.some((existingNotice) => existingNotice.id === notice.id)
      ? previousNotices
      : [...previousNotices, notice]
  );
}

interface NotificationEventHandlerOptions extends NoticeActions {
  seenEvents: Set<string>;
  listeners: Set<ResourceSubscription>;
  setNotices: Dispatch<SetStateAction<ActionableNotice[]>>;
}

function handleNotificationEvent(event: WsEvent, options: NotificationEventHandlerOptions) {
  if (event.type !== "notification.created") return;

  const eventKey = getDeduplicationKey(event.notification);
  if (!rememberEvent(eventKey, options.seenEvents)) return;

  const { notification, jobRequest } = mapNotificationEvent(event);
  dispatchResourceEvent(options.listeners, notification, jobRequest);
  const notice = createActionableNotice(notification, eventKey, options);
  enqueueActionableNotice(notice, options.setNotices);
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { subscribe } = useWebSocket();
  const [notices, setNotices] = useState<ActionableNotice[]>([]);
  const [activeModalWorkOrderId, setActiveModalWorkOrderId] = useState<number | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Set<ResourceSubscription>>(new Set());

  const {
    startAuthorization,
    isAuthorizing: isCalendarAuthorizationPending,
    error: calendarAuthorizationError,
  } = useCalendarAuthorization();

  const dismissNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const openWorkOrderDetail = useCallback((id: number) => {
    setActiveModalWorkOrderId(id);
  }, []);

  const closeWorkOrderDetail = useCallback(() => {
    setActiveModalWorkOrderId(null);
  }, []);

  const subscribeResource = useCallback(
    (
      resourceType: RealtimeResourceType,
      resourceId: number | undefined,
      callback: ResourceListener
    ) => {
      const entry = { resourceType, resourceId, callback };
      listenersRef.current.add(entry);
      return () => {
        listenersRef.current.delete(entry);
      };
    },
    []
  );

  useEffect(() => {
    const unsubscribe = subscribe((event) => handleNotificationEvent(event, {
      seenEvents: seenEventsRef.current,
      listeners: listenersRef.current,
      setNotices,
      dismissNotice,
      openWorkOrderDetail,
      startAuthorization,
    }));

    return unsubscribe;
  }, [
    dismissNotice,
    openWorkOrderDetail,
    startAuthorization,
    subscribe,
  ]);

  const noticesWithCalendarState = notices.map((notice) =>
    notice.type === "calendar_reauthorization_required"
      ? {
          ...notice,
          actionError: calendarAuthorizationError,
          isActionPending: isCalendarAuthorizationPending,
        }
      : notice
  );

  return (
    <NotificationContext.Provider
      value={{
        notices: noticesWithCalendarState,
        dismissNotice,
        subscribeResource,
        activeModalWorkOrderId,
        openWorkOrderDetail,
        closeWorkOrderDetail,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
