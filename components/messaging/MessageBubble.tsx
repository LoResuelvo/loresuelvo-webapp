import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface MessageBubbleProps {
  id: string;
  content?: string;
  sentAt: string;
  isExpanded: boolean;
  showExpandButton: boolean;
  onToggleExpand: (id: string) => void;
  isOwnMessage?: boolean;
}

export default function MessageBubble({
  id,
  content,
  sentAt,
  isExpanded,
  showExpandButton,
  onToggleExpand,
  isOwnMessage = true,
}: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        data-testid={`message-bubble-${id}`}
        className={`rounded-2xl p-4 max-w-md ${
          isOwnMessage
            ? "bg-brand-primary text-white rounded-tr-sm"
            : "bg-white text-brand-primary border border-slate-200 rounded-tl-sm"
        }`}
      >
        {content && (
          <p className={`text-[14px] whitespace-pre-wrap break-words ${!isExpanded && showExpandButton ? "line-clamp-5" : ""}`}>
            {content}
          </p>
        )}
        {showExpandButton && (
          <Button
            variant="ghost"
            onClick={() => onToggleExpand(id)}
            className={`text-[11px] mt-1 hover:underline p-0 h-auto hover:bg-transparent ${
              isOwnMessage ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {isExpanded ? t.messaging.expandLess : t.messaging.expandMore}
          </Button>
        )}
        <p className={`text-[11px] mt-2 ${isOwnMessage ? "text-white/70" : "text-slate-400"}`}>{sentAt}</p>
      </div>
    </div>
  );
}