"use client";

import { Wallet } from "lucide-react";
import type { PaymentAccountConnection } from "@/domain/payment-account/types";
import type { MercadoPagoCallbackResult } from "@/app/profile/mercado-pago-result";
import { t } from "@/infrastructure/i18n/translations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import MercadoPagoConnectionFeedback from "./MercadoPagoConnectionFeedback";
import {
  clearMercadoPagoConnectionOrigin,
  markMercadoPagoConnectionFromProfile,
} from "@/lib/mercado-pago-profile-origin";
import { useMercadoPagoAuthorization } from "./useMercadoPagoAuthorization";

interface MercadoPagoConnectionCardProps {
  connection: PaymentAccountConnection | null;
  callbackResult?: MercadoPagoCallbackResult | null;
}

function getConnectionStatusLabel(
  status: PaymentAccountConnection["status"] | undefined,
): string {
  if (status === "connected") return t.profile.mercadoPago.connectedStatus;
  if (status === "pending") return t.profile.mercadoPago.pendingStatus;
  return t.profile.mercadoPago.unavailableStatus;
}

export default function MercadoPagoConnectionCard({
  connection,
  callbackResult,
}: MercadoPagoConnectionCardProps) {
  const copy = t.profile.mercadoPago;
  const authorization = useMercadoPagoAuthorization({
    onAuthorizationStarting: markMercadoPagoConnectionFromProfile,
    onAuthorizationFailed: clearMercadoPagoConnectionOrigin,
  });
  const status = connection?.status;
  const statusLabel = getConnectionStatusLabel(status);

  return (
    <Card
      role="region"
      aria-labelledby="mercado-pago-card-title"
      className="w-full"
    >
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="shrink-0 rounded-xl bg-brand-secondary/10 p-2 text-brand-secondary"
            aria-hidden="true"
          >
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="mercado-pago-card-title" className="font-heading text-lg font-semibold">
              {copy.title}
            </h3>
            <CardDescription className="mt-1 leading-relaxed">{copy.description}</CardDescription>
          </div>
        </div>
        <Badge
          data-state={status}
          className="shrink-0 self-start px-3 py-1 ring-1 ring-inset ring-slate-200/70 data-[state=pending]:bg-slate-100 data-[state=pending]:text-slate-600"
          variant={status === "connected" ? "success" : status ? "outline" : "warning"}
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 sm:pl-18">
        <MercadoPagoConnectionFeedback result={callbackResult} status={status} />
        {!connection && (
          <div role="alert" aria-live="polite" className="mb-4 text-body text-rose-700">
            {copy.connectionError}
          </div>
        )}
        {authorization.error && (
          <div role="alert" aria-live="assertive" className="mb-4 text-body text-rose-700">
            {authorization.error}
          </div>
        )}
        {status === "pending" && (
          <Button
            type="button"
            variant="brandSecondary"
            size="action"
            className="min-h-11 whitespace-normal sm:w-auto sm:px-5"
            disabled={authorization.isAuthorizing}
            onClick={() => void authorization.startAuthorization()}
          >
            {authorization.isAuthorizing ? copy.connecting : copy.connectAction}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
