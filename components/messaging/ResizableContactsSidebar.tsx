import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import ContactList from "./ContactList";
import { ConversationContact } from "@/domain/messaging/types";

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 220;
const MAX_WIDTH = 500;

interface ResizableContactsSidebarProps {
  contacts: ConversationContact[];
  selectedProviderId: string | null;
  onContactClick: (providerId: string) => void;
  className?: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export default function ResizableContactsSidebar({
  contacts,
  selectedProviderId,
  onContactClick,
  className,
  initialWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
}: ResizableContactsSidebarProps) {
  const [width, setWidth] = useState(initialWidth);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleSeparatorMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    dragStateRef.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return;
      const { startX, startWidth } = dragStateRef.current;
      const delta = e.clientX - startX;
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      setWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [minWidth, maxWidth]);

  return (
    <>
      <div
        data-testid="resizable-contacts-sidebar"
        style={{ width: `${width}px` }}
        className={`${className ?? ""} border-r border-slate-200 bg-white flex flex-col h-full flex-shrink-0`}
      >
        <ContactList
          contacts={contacts}
          selectedProviderId={selectedProviderId}
          onContactClick={onContactClick}
        />
      </div>
      <div
        role="separator"
        aria-label="Redimensionar lista"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        onMouseDown={handleSeparatorMouseDown}
        data-testid="contacts-separator"
        className="w-1 hover:bg-slate-300 cursor-col-resize flex-shrink-0 hidden md:block"
      />
    </>
  );
}