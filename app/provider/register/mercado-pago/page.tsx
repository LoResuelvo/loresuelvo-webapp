"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";
import { startMercadoPagoConnectionAction } from "@/app/onboarding/mercado-pago-actions";
import { AmbientGlows } from "@/components/ui/AmbientGlows";

function MercadoPagoCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = searchParams.get("result");

  async function handleRetry() {
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

  function handleContinue() {
    router.push(ROUTES.provider.home);
  }

  // Redirect if result is invalid/missing
  if (!result || (result !== "success" && result !== "cancelled")) {
    if (typeof window !== "undefined") {
      router.replace(ROUTES.provider.home);
    }
    return <LoadingState />;
  }

  const isSuccess = result === "success";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      <AmbientGlows />
      
      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-border/60 bg-card/60 p-8 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          {isSuccess ? (
            <>
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-inner animate-bounce duration-1000">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
                {t.onboarding.mercadoPago.connectionSuccess}
              </h1>
              <p className="mb-8 text-[15px] text-muted-foreground leading-relaxed">
                {t.onboarding.mercadoPago.connectionSuccessSubtitle}
              </p>
              <Button
                id="mp-success-continue-btn"
                variant="brand"
                size="full"
                onClick={handleContinue}
              >
                {t.onboarding.mercadoPago.continueButton}
              </Button>
            </>
          ) : (
            <>
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-inner">
                <AlertTriangle className="h-10 w-10 animate-pulse" />
              </div>
              <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
                {t.onboarding.mercadoPago.connectionCancelled}
              </h1>
              <p className="mb-8 text-[15px] text-muted-foreground leading-relaxed">
                {t.onboarding.mercadoPago.connectionCancelledSubtitle}
              </p>
              
              {error && (
                <div className="mb-6 w-full text-sm text-destructive bg-destructive/10 rounded-lg p-3 text-left">
                  {error}
                </div>
              )}

              <div className="w-full space-y-3">
                <Button
                  id="mp-retry-btn"
                  variant="brand"
                  size="full"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.onboarding.mercadoPago.connecting}
                    </>
                  ) : (
                    t.onboarding.mercadoPago.retryButton
                  )}
                </Button>
                <Button
                  id="mp-cancel-continue-btn"
                  variant="ghost"
                  size="full"
                  onClick={handleContinue}
                  disabled={isLoading}
                >
                  {t.onboarding.mercadoPago.continueButton}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      <AmbientGlows />
      <div className="relative z-10 flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary mb-4" />
        <p className="text-muted-foreground text-sm">{t.onboarding.mercadoPago.connecting}</p>
      </div>
    </div>
  );
}

export default function MercadoPagoCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MercadoPagoCallbackContent />
    </Suspense>
  );
}
