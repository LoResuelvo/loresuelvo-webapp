"use client";

import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

export interface AiChatHeaderProps {
  onBack?: () => void;
  className?: string;
}

export function AiChatHeader({ onBack, className }: AiChatHeaderProps) {
  return (
    <div className={cn("border-b border-slate-200 bg-white flex-shrink-0", className)}>
      <div className="h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-brand-primary transition-colors"
            aria-label={t.aiDiagnosis.backToList}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <Avatar
          alt={t.aiDiagnosis.assistantName}
          initials="IA"
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-primary truncate">
            {t.aiDiagnosis.assistantName}
          </p>
        </div>
      </div>
    </div>
  );
}
