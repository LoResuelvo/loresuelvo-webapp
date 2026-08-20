import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const detailFieldVariants = cva(
  "flex items-center gap-3.5 rounded-xl border transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-50/80 border-slate-200/60 p-3.5 hover:bg-slate-50",
        highlight:
          "bg-slate-50/80 border-slate-200/60 p-3.5 hover:bg-slate-50",
        compact:
          "bg-slate-50/50 border-slate-200/40 p-2.5",
        subtle:
          "bg-transparent border-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconWrapperVariants = cva(
  "rounded-lg bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center shrink-0",
  {
    variants: {
      variant: {
        default: "w-10 h-10 text-brand-primary",
        highlight: "w-10 h-10 text-brand-primary",
        compact: "w-8 h-8 text-brand-primary",
        subtle: "w-6 h-6 text-brand-primary bg-transparent border-none shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const labelVariants = cva(
  "font-semibold text-slate-400 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "text-caption",
        highlight: "text-caption",
        compact: "text-caption",
        subtle: "text-caption",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const valueVariants = cva("truncate leading-tight", {
  variants: {
    variant: {
      default: "text-body-lg font-semibold text-slate-700",
      highlight: "text-title font-bold text-slate-800",
      compact: "text-body font-medium text-slate-700",
      subtle: "text-body font-medium text-slate-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface DetailFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof detailFieldVariants> {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  labelClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
  dataTestId?: string;
}

export function DetailField({
  icon,
  label,
  value,
  variant = "default",
  className,
  labelClassName,
  valueClassName,
  iconClassName,
  dataTestId,
  ...props
}: DetailFieldProps) {
  return (
    <div
      className={cn(detailFieldVariants({ variant }), className)}
      data-testid={dataTestId}
      {...props}
    >
      {icon && (
        <div className={cn(iconWrapperVariants({ variant }), iconClassName)}>
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <span className={cn(labelVariants({ variant }), labelClassName)}>
          {label}
        </span>
        <span className={cn(valueVariants({ variant }), valueClassName)}>
          {value}
        </span>
      </div>
    </div>
  );
}

export { detailFieldVariants };
