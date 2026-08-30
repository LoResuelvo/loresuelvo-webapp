"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";
import { AmbientGlows } from "@/components/landing/ambient-glows";
import { MercadoPagoSuccess } from "./MercadoPagoSuccess";
import { MercadoPagoError } from "./MercadoPagoError";

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

function MercadoPagoCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const result = searchParams.get("result");

  if (!result || (result !== "success" && result !== "cancelled")) {
    if (typeof window !== "undefined") {
      router.replace(ROUTES.provider.home);
    }
    return <LoadingState />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      <AmbientGlows />

      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-border/60 bg-card/60 p-8 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          {result === "success" ? (
            <MercadoPagoSuccess onContinue={() => router.push(ROUTES.provider.home)} />
          ) : (
            <MercadoPagoError
              onRetry={() => router.push(ROUTES.onboarding)}
              onContinue={() => router.push(ROUTES.provider.home)}
            />
          )}
        </div>
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
