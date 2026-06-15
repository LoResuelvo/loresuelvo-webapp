import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export interface MessageInputHandle {
  focus: () => void;
}

const LINE_HEIGHT = 24;
const MAX_LINES = 6;

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ value, onChange, onSend, disabled }, ref) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
      const textarea = inputRef.current;
      if (!textarea) return;
      if (!value || !value.trim()) {
        textarea.rows = 1;
        textarea.style.height = `${LINE_HEIGHT}px`;
        textarea.style.overflowY = "hidden";
        return;
      }
      const lineCount = value.split("\n").length;
      const effectiveLines = Math.min(Math.max(lineCount, 1), MAX_LINES);
      textarea.rows = effectiveLines;
      textarea.style.height = "auto";
      const maxHeight = LINE_HEIGHT * MAX_LINES;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
      textarea.style.overflowY = lineCount > MAX_LINES ? "auto" : "hidden";
    }, [value]);

    useEffect(() => {
      adjustHeight();
    }, [adjustHeight]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      adjustHeight();
    };

    const setRef = useCallback((node: HTMLTextAreaElement | null) => {
      inputRef.current = node;
      if (node) {
        node.rows = 1;
        node.style.height = `${LINE_HEIGHT}px`;
        node.style.overflowY = "hidden";
      }
    }, []);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <div className="p-4 flex gap-3 bg-white border-t border-slate-200 flex-shrink-0">
        <textarea
          ref={setRef}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Escribe un mensaje..."
          className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 bg-white text-[14px] leading-6 focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Enviar mensaje"
          className="px-5 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
