"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wallet, AlertCircle } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";
import { startMercadoPagoConnectionAction } from "@/app/onboarding/mercado-pago-actions";
import { cn } from "@/lib/utils";

interface MercadoPagoConnectionStepProps {
  className?: string;
}

export function MercadoPagoConnectionStep({ className }: MercadoPagoConnectionStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConnect() {
    setIsLoading(true);
    setError(null);
    try {
      const { authorizationUrl } = await startMercadoPagoConnectionAction();
      router.push(authorizationUrl);
    } catch (err) {
      console.error(err);
      setError(t.onboarding.mercadoPago.errorGeneric);
      setIsLoading(false);
    }
  }

  function handleLater() {
    router.push(ROUTES.provider.home);
  }

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight text-brand-primary">
          {t.onboarding.mercadoPago.title}
        </h1>
        <p className="text-[15px] text-muted-foreground max-w-[340px] mx-auto">
          {t.onboarding.mercadoPago.subtitle}
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3.5 text-[14px] text-destructive">
          <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="w-full space-y-3">
        <Button
          id="mp-connect-btn"
          type="button"
          variant="brand"
          size="full"
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? t.onboarding.mercadoPago.connecting : t.onboarding.mercadoPago.connectButton}
        </Button>

        <Button
          id="mp-later-btn"
          type="button"
          variant="ghost"
          size="full"
          onClick={handleLater}
          disabled={isLoading}
        >
          {t.onboarding.mercadoPago.laterButton}
        </Button>
      </div>
    </div>
  );
}
