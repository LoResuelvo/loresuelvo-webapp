import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentPollingOverlayProps {
  message?: string;
  className?: string;
}

export function PaymentPollingOverlay({
  message,
  className,
}: PaymentPollingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-2 text-slate-500",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
      {message && <span className="text-xs font-medium text-slate-500">{message}</span>}
    </div>
  );
}
