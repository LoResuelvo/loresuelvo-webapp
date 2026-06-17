import { forwardRef, useImperativeHandle, useRef } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

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
        <Input
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
          placeholder={t.messaging.inputPlaceholder}
          className="flex-1 px-4 h-[48px] rounded-xl border border-slate-200 bg-white text-[14px] focus-visible:ring-brand-secondary/40"
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label={t.messaging.sendLabel}
          className="h-[48px] px-5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-semibold"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
