interface MessageBubbleProps {
  id: string;
  content: string;
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
      <div className={`rounded-2xl p-4 max-w-md ${
        isOwnMessage
          ? "bg-brand-primary text-white rounded-tr-sm"
          : "bg-white text-brand-primary border border-slate-200 rounded-tl-sm"
      }`}>
        <p className={`text-[14px] whitespace-pre-wrap break-words ${!isExpanded && showExpandButton ? "line-clamp-5" : ""}`}>
          {content}
        </p>
        {showExpandButton && (
          <button
            onClick={() => onToggleExpand(id)}
            className={`text-[11px] mt-1 hover:underline ${
              isOwnMessage ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {isExpanded ? "Ver menos" : "Ver más"}
          </button>
        )}
        <p className={`text-[11px] mt-2 ${isOwnMessage ? "text-white/70" : "text-slate-400"}`}>{sentAt}</p>
      </div>
    </div>
  );
}