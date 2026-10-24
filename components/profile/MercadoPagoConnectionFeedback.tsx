"use client";

import { useEffect } from "react";
import type { PaymentAccountConnection } from "@/domain/payment-account/types";
import type { MercadoPagoCallbackResult } from "@/app/profile/mercado-pago-result";
import { t } from "@/infrastructure/i18n/translations";
import InfoBanner from "@/components/messaging/InfoBanner";

interface MercadoPagoConnectionFeedbackProps {
  result?: MercadoPagoCallbackResult | null;
  status?: PaymentAccountConnection["status"];
}

export default function MercadoPagoConnectionFeedback({
  result,
  status,
}: MercadoPagoConnectionFeedbackProps) {
  const copy = t.profile.mercadoPago;
  const successConfirmed = result === "success" && status === "connected";

  useEffect(() => {
    if (!result) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("mercado_pago_result");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [result]);

  if (!result) return null;

  const message =
    result === "cancelled"
      ? copy.connectionCancelled
      : successConfirmed
        ? copy.connectionSuccess
        : copy.connectionSuccessUnconfirmed;

  return <InfoBanner tone={successConfirmed ? "info" : "warning"}>{message}</InfoBanner>;
}
