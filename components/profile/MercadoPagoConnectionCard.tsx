"use client";

import { Wallet } from "lucide-react";
import type { PaymentAccountConnection } from "@/domain/payment-account/types";
import { t } from "@/infrastructure/i18n/translations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useMercadoPagoAuthorization } from "./useMercadoPagoAuthorization";

interface MercadoPagoConnectionCardProps {
  connection: PaymentAccountConnection | null;
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
}: MercadoPagoConnectionCardProps) {
  const copy = t.profile.mercadoPago;
  const authorization = useMercadoPagoAuthorization();
  const status = connection?.status;
  const statusLabel = getConnectionStatusLabel(status);

  return (
    <Card
      role="region"
      aria-labelledby="mercado-pago-card-title"
      className="w-full max-w-2xl"
    >
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="rounded-xl bg-brand-secondary/10 p-2 text-brand-secondary"
            aria-hidden="true"
          >
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h2 id="mercado-pago-card-title" className="font-heading text-lg font-semibold">
              {copy.title}
            </h2>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
        <Badge variant={status === "connected" ? "success" : status ? "outline" : "warning"}>
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent>
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
