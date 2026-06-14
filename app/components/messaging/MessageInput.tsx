import { forwardRef, useImperativeHandle, useRef } from "react";
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

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ value, onChange, onSend, disabled }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    return (
      <div className="p-4 flex gap-3 bg-white border-t border-slate-200 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
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