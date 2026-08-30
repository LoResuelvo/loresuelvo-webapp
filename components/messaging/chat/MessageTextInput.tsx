import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { t } from "@/infrastructure/i18n/translations";

export interface MessageTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageTextInput = forwardRef<HTMLInputElement, MessageTextInputProps>(
  ({ value, onChange, onSend, disabled = false, placeholder }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder ?? t.messaging.inputPlaceholder}
        className="flex-1 h-9 border-none bg-transparent shadow-none px-1 text-sm focus-visible:ring-0 text-slate-800 placeholder:text-slate-400"
        disabled={disabled}
      />
    );
  }
);

MessageTextInput.displayName = "MessageTextInput";
