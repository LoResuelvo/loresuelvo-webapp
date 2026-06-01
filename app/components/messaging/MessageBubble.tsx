interface MessageBubbleProps {
  id: string;
  content: string;
  sentAt: string;
  isExpanded: boolean;
  showExpandButton: boolean;
  onToggleExpand: (id: string) => void;
}

export default function MessageBubble({
  id,
  content,
  sentAt,
  isExpanded,
  showExpandButton,
  onToggleExpand,
}: MessageBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="bg-brand-primary text-white rounded-2xl rounded-tr-sm p-4 max-w-md">
        <p className={`text-[14px] whitespace-pre-wrap break-words ${!isExpanded && showExpandButton ? "line-clamp-5" : ""}`}>
          {content}
        </p>
        {showExpandButton && (
          <button
            onClick={() => onToggleExpand(id)}
            className="text-[11px] text-white/70 mt-1 hover:text-white underline"
          >
            {isExpanded ? "Ver menos" : "Ver más"}
          </button>
        )}
        <p className="text-[11px] text-white/70 mt-2">{sentAt}</p>
      </div>
    </div>
  );
}