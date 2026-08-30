import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

export interface MercadoPagoSuccessProps {
  onContinue: () => void;
}

export function MercadoPagoSuccess({ onContinue }: MercadoPagoSuccessProps) {
  return (
    <>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-inner animate-bounce duration-1000">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
        {t.onboarding.mercadoPago.connectionSuccess}
      </h1>
      <p className="mb-8 text-body-lg text-muted-foreground leading-relaxed">
        {t.onboarding.mercadoPago.connectionSuccessSubtitle}
      </p>
      <Button
        id="mp-success-continue-btn"
        variant="brand"
        size="full"
        onClick={onContinue}
      >
        {t.onboarding.mercadoPago.continueButton}
      </Button>
    </>
  );
}
