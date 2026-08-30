import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

export interface MercadoPagoErrorProps {
  onRetry: () => void;
  onContinue: () => void;
}

export function MercadoPagoError({ onRetry, onContinue }: MercadoPagoErrorProps) {
  return (
    <>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-inner">
        <AlertTriangle className="h-10 w-10 animate-pulse" />
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
        {t.onboarding.mercadoPago.connectionCancelled}
      </h1>
      <p className="mb-8 text-body-lg text-muted-foreground leading-relaxed">
        {t.onboarding.mercadoPago.connectionCancelledSubtitle}
      </p>

      <div className="w-full space-y-3">
        <Button
          id="mp-retry-btn"
          variant="brand"
          size="full"
          onClick={onRetry}
        >
          {t.onboarding.mercadoPago.retryButton}
        </Button>
        <Button
          id="mp-cancel-continue-btn"
          variant="ghost"
          size="full"
          onClick={onContinue}
        >
          {t.onboarding.mercadoPago.continueButton}
        </Button>
      </div>
    </>
  );
}
