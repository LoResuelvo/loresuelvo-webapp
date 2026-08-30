"use client";

import Link from "next/link";
import { Clock3, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { StatusBadge, type StatusVariant } from "./StatusBadge";

export interface PaymentPendingViewProps {
  title: string;
  description: string;
  variant?: StatusVariant;
  icon?: LucideIcon;
  animateIcon?: boolean;
  isServiceBalance?: boolean;
  canRetryVerification?: boolean;
  onRetryVerification?: () => void;
}

export function PaymentPendingView({
  title,
  description,
  variant = "info",
  icon = Clock3,
  animateIcon = false,
  isServiceBalance = false,
  canRetryVerification = false,
  onRetryVerification,
}: PaymentPendingViewProps) {
  const backLabel = isServiceBalance
    ? t.payments.result.balance.backToServices
    : t.payments.result.backToProposals;

  return (
    <>
      <StatusBadge variant={variant} icon={icon} animate={animateIcon} />
      <div className="space-y-2.5 max-w-sm sm:max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
          {title}
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-slate-600">
          {description}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:items-center">
        {canRetryVerification && onRetryVerification && (
          <Button
            type="button"
            variant="brand"
            className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-semibold shadow-sm"
            onClick={onRetryVerification}
          >
            {t.payments.result.checkAgain}
          </Button>
        )}
        <Button
          asChild
          variant="brandSecondary"
          className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl font-semibold shadow-sm"
        >
          <Link href={ROUTES.consumer.services}>
            {backLabel}
          </Link>
        </Button>
      </div>
    </>
  );
}
