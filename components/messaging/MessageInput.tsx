import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import Image from "next/image";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
}

export interface MessageInputHandle {
  focus: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ value, onChange, onSend, disabled, attachedFiles = [], onAttachFiles, onRemoveFile }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && onAttachFiles) {
        const filesArray = Array.from(e.target.files);
        const validFiles = filesArray.filter(file => {
          if (file.size > 5 * 1024 * 1024) {
            setError(t.messaging.fileTooLarge);
            return false;
          }
          return true;
        });
        if (validFiles.length > 0) {
          setError(null);
          onAttachFiles(validFiles);
        }
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    return (
      <div className="flex flex-col border-t border-slate-200 bg-white flex-shrink-0">
        {attachedFiles.length > 0 && (
          <div className="p-3 pb-0 flex gap-2 overflow-x-auto">
            {attachedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-md overflow-hidden border border-slate-200 bg-slate-50 relative">
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={`Vista previa de ${file.name}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(idx)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 flex gap-3 items-center">
          {onAttachFiles && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                multiple
                onChange={handleFileChange}
                disabled={disabled || attachedFiles.length >= 5}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || attachedFiles.length >= 5}
                aria-label="Adjuntar imágenes"
                className="text-slate-500 hover:text-brand-primary"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </>
          )}
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (value.trim() || attachedFiles.length > 0) {
                  setError(null);
                  onSend();
                }
              }
            }}
            placeholder={t.messaging.inputPlaceholder}
            className="flex-1 px-4 h-[48px] rounded-xl border border-slate-200 bg-white text-[14px] focus-visible:ring-brand-secondary/40"
            disabled={disabled}
          />
          <Button
            variant="brand"
            type="button"
            onClick={onSend}
            disabled={disabled || (!value.trim() && attachedFiles.length === 0)}
            aria-label={t.messaging.sendLabel}
            className="h-[48px] px-5 rounded-xl font-semibold"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
        {error && (
          <div className="px-4 pb-2 text-red-500 text-sm font-medium">
            {error}
          </div>
        )}
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
