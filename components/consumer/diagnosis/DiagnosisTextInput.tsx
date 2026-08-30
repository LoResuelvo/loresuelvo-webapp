"use client";

import { Textarea } from "@/components/ui/textarea";
import { t } from "@/infrastructure/i18n/translations";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { cn } from "@/lib/utils";

export interface DiagnosisTextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DiagnosisTextInput({
  value,
  onChange,
  disabled = false,
  className,
}: DiagnosisTextInputProps) {
  const { ref: textareaRef } = useAutoResizeTextarea(value, {
    minRows: 2,
    maxRows: 6,
    lineHeight: 24,
  });

  return (
    <Textarea
      ref={textareaRef}
      id="diagnosis-message"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t.consumerDiagnosis.hero.placeholder}
      className={cn(
        "flex-1 min-w-0 rounded-lg bg-white/20 backdrop-blur px-4 py-3 text-body-lg text-white placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-white/70 resize-none leading-6 min-h-0",
        className
      )}
      disabled={disabled}
    />
  );
}
