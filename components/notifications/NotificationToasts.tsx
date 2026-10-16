"use client";

import { useNotifications } from "@/infrastructure/notifications/NotificationContext";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { Bell, Calendar, X } from "lucide-react";
import { WorkOrderDetailModal } from "@/components/work-orders/WorkOrderDetailModal";

interface NotificationToastsProps {
  role?: string;
}

export function NotificationToasts({ role }: NotificationToastsProps) {
  const {
    notices,
    dismissNotice,
    activeModalWorkOrderId,
    closeWorkOrderDetail,
  } = useNotifications();

  const isConsumer = role === "consumer";

  return (
    <>
      {notices.length > 0 && (
        <div
          data-testid="notification-toasts-container"
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
        >
          {notices.map((notice) => {
            const isCalendar = notice.resourceType === "calendar_connection";
            const Icon = isCalendar ? Calendar : Bell;

            return (
              <div
                key={notice.id}
                role="status"
                aria-live="polite"
                data-testid={`notification-toast-${notice.id}`}
                className="pointer-events-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-slate-800">
                    {notice.title}
                  </p>
                  <p className="text-caption text-slate-600 mt-0.5">
                    {notice.description}
                  </p>
                  {notice.actionLabel && notice.onAction && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={notice.onAction}
                        className="h-8 px-3 text-caption font-semibold"
                        data-testid={`toast-action-${notice.id}`}
                      >
                        {notice.actionLabel}
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissNotice(notice.id)}
                  aria-label={t.notifications.toast.closeAriaLabel}
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 shrink-0 -mr-1 -mt-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {activeModalWorkOrderId !== null && (
        <WorkOrderDetailModal
          open={true}
          onClose={closeWorkOrderDetail}
          workOrderId={activeModalWorkOrderId}
          isConsumer={isConsumer}
        />
      )}
    </>
  );
}

export default NotificationToasts;
