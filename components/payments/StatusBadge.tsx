import { cn } from "@/lib/utils";

export type StatusVariant = "info" | "success" | "warning" | "danger";

const VARIANT_STYLES: Record<StatusVariant, string> = {
  info: "bg-brand-primary/10 text-brand-primary ring-brand-primary/5",
  success: "bg-emerald-50 text-brand-accept ring-emerald-50/60",
  warning: "bg-amber-50 text-amber-600 ring-amber-50/60",
  danger: "bg-rose-50 text-brand-danger ring-rose-50/60",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  animate?: boolean;
}

export function StatusBadge({ variant, icon: Icon, animate = false }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl ring-8 shadow-sm",
        VARIANT_STYLES[variant],
      )}
    >
      <Icon className={cn("h-8 w-8", animate && "animate-pulse")} aria-hidden="true" />
    </div>
  );
}
