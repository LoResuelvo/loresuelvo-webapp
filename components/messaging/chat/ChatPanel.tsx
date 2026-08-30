import { MessageSquare } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

export interface ChatPanelProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ChatPanel({
  header,
  footer,
  children,
  emptyState,
  className,
}: ChatPanelProps) {
  if (emptyState) {
    return (
      <div className={cn("flex-1 flex items-center justify-center bg-brand-neutral/30", className)}>
        {emptyState}
      </div>
    );
  }

  if (!header && !children && !footer) {
    return (
      <div className={cn("flex-1 flex items-center justify-center bg-brand-neutral/30", className)}>
        <div className="text-center">
          <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400">{t.messaging.selectContact}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="chat-panel"
      role="region"
      aria-label={t.messaging.chatPanelLabel}
      className={cn("flex-1 flex flex-col bg-brand-neutral/30 min-h-0", className)}
    >
      {header}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
        {footer}
      </div>
    </div>
  );
}

export default ChatPanel;
