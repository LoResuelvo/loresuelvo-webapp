import { cn } from "@/lib/utils";

export interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const isNearLimit = current >= max * 0.9;
  const isAtLimit = current >= max;

  return (
    <span
      className={cn(
        "text-caption font-medium transition-colors",
        isAtLimit
          ? "text-red-500 font-semibold"
          : isNearLimit
          ? "text-amber-500"
          : "text-slate-400",
        className
      )}
      aria-live="polite"
    >
      {current}/{max}
    </span>
  );
}
