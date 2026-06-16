import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface WorkRequestModalHeaderProps {
  onClose: () => void;
}

export function WorkRequestModalHeader({ onClose }: WorkRequestModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 className="font-bold text-[18px] text-brand-primary">{t.consumerSearch.modal.title}</h3>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors h-7 w-7"
        type="button"
        aria-label={t.consumerSearch.modal.closeLabel}
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}
