"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useWebSocket } from "@/infrastructure/websocket";
import type {
  RealtimeJobRequestPayload,
  RealtimeNotification,
  RealtimeNotificationType,
  RealtimeResourceType,
} from "@/domain/notification/types";
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
  onAction?: () => void;
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
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribeResource(resourceType, resourceId, (event, jobRequest) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(event, jobRequest);
      }, debounceMs);
    });
  }, [ctx, resourceType, resourceId, debounceMs]);
}

interface NotificationProviderProps {
  children: ReactNode;
  role?: string;
}

function getDeduplicationKey(notice: {
  id: number;
  type: string;
  resource_type: string;
  resource_id: number;
  created_at: string;
}): string {
  if (notice.id > 0) {
    return `id:${notice.id}`;
  }
  return `${notice.type}:${notice.resource_type}:${notice.resource_id}:${notice.created_at}`;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { subscribe } = useWebSocket();
  const [notices, setNotices] = useState<ActionableNotice[]>([]);
  const [activeModalWorkOrderId, setActiveModalWorkOrderId] = useState<number | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Set<{
    resourceType: RealtimeResourceType;
    resourceId?: number;
    callback: ResourceListener;
  }>>(new Set());

  const { startAuthorization } = useCalendarAuthorization();

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
    const unsubscribe = subscribe((event) => {
      if (event.type !== "notification.created") return;

      const rawNotice = event.notification;
      const dedupeKey = getDeduplicationKey(rawNotice);

      if (seenEventsRef.current.has(dedupeKey)) {
        return;
      }
      seenEventsRef.current.add(dedupeKey);

      // Keep recent dedupe set bounded
      if (seenEventsRef.current.size > 200) {
        const first = seenEventsRef.current.values().next().value;
        if (first) seenEventsRef.current.delete(first);
      }

      const domainNotice: RealtimeNotification = {
        id: rawNotice.id,
        userId: rawNotice.user_id,
        type: rawNotice.type as RealtimeNotificationType,
        resourceType: rawNotice.resource_type as RealtimeResourceType,
        resourceId: rawNotice.resource_id,
        estimatedDurationMinutes: rawNotice.estimated_duration_minutes,
        readAt: rawNotice.read_at,
        createdAt: rawNotice.created_at,
      };

      let domainJobRequest: RealtimeJobRequestPayload | undefined;
      if (event.job_request) {
        domainJobRequest = {
          id: event.job_request.id,
          conversationId: event.job_request.conversation_id,
          title: event.job_request.title,
          description: event.job_request.description,
          status: event.job_request.status,
          requester: {
            name: event.job_request.requester.name,
            surname: event.job_request.requester.surname,
          },
          images: event.job_request.images.map((img) => ({
            id: img.id,
            originalName: img.original_name,
            url: img.url,
          })),
        };
      }

      // 1. Dispatch to mounted resource listeners
      listenersRef.current.forEach(({ resourceType, resourceId, callback }) => {
        if (
          resourceType === domainNotice.resourceType &&
          (resourceId === undefined || resourceId === domainNotice.resourceId)
        ) {
          try {
            callback(domainNotice, domainJobRequest);
          } catch (err) {
            console.error("Resource listener error:", err);
          }
        }
      });

      // 2. Queue actionable notices when applicable
      if (domainNotice.type === "work_order_close_to_scheduled_time") {
        const orderId = domainNotice.resourceId;
        setNotices((prev) => {
          if (prev.some((n) => n.id === dedupeKey)) return prev;
          return [
            ...prev,
            {
              id: dedupeKey,
              type: domainNotice.type,
              title: t.notifications.workOrderCloseToScheduledTime.title,
              description: t.notifications.workOrderCloseToScheduledTime.description,
              actionLabel: t.notifications.workOrderCloseToScheduledTime.action,
              resourceType: "work_order",
              resourceId: orderId,
              onAction: () => {
                openWorkOrderDetail(orderId);
                dismissNotice(dedupeKey);
              },
            },
          ];
        });
      } else if (domainNotice.type === "calendar_reauthorization_required") {
        setNotices((prev) => {
          if (prev.some((n) => n.id === dedupeKey)) return prev;
          return [
            ...prev,
            {
              id: dedupeKey,
              type: domainNotice.type,
              title: t.notifications.calendarReauthorizationRequired.title,
              description: t.notifications.calendarReauthorizationRequired.description,
              actionLabel: t.notifications.calendarReauthorizationRequired.action,
              resourceType: "calendar_connection",
              resourceId: domainNotice.resourceId,
              onAction: () => {
                startAuthorization();
                dismissNotice(dedupeKey);
              },
            },
          ];
        });
      }
    });

    return unsubscribe;
  }, [
    dismissNotice,
    openWorkOrderDetail,
    startAuthorization,
    subscribe,
  ]);

  return (
    <NotificationContext.Provider
      value={{
        notices,
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
