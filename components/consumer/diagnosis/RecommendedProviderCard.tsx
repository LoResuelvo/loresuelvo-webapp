import React, { useState } from "react";
import { RecommendedProvider, ProblemAssessment } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface RecommendedProviderCardProps {
  provider: RecommendedProvider;
  assessment?: ProblemAssessment;
  onContactProvider?: (providerId: number) => Promise<void>;
}

export function RecommendedProviderCard({
  provider,
  assessment,
  onContactProvider,
}: RecommendedProviderCardProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "duplicate">("idle");

  const showButton = assessment?.outcome === "professional_required";

  const handleContact = async () => {
    setState("sending");
    try {
      if (onContactProvider) {
        await onContactProvider(provider.id);
      }
      setState("sent");
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "status" in err ? (err as { status: unknown }).status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      if (status === 409 || message.includes("409") || message.includes("Ya existe")) {
        setState("duplicate");
      } else {
        setState("error");
      }
    }
  };

  return (
    <Card
      variant="interactive"
      className="flex flex-row items-center justify-between p-4"
      data-testid="recommended-provider"
    >
      <div className="flex flex-row items-center">
        <Avatar
          size="md"
          src={provider.profilePhotoUrl}
          alt={`${provider.name} ${provider.surname}`}
          initials={`${provider.name.charAt(0)}${provider.surname.charAt(0)}`}
          imgTestId={`avatar-img-${provider.id}`}
          fallbackTestId={`avatar-fallback-${provider.id}`}
        />
        <div className="flex flex-col ml-4">
          <span className="font-semibold text-base">
            {provider.name} {provider.surname}
          </span>
          <span className="text-sm text-slate-500">{provider.categoryName}</span>
        </div>
      </div>

      {showButton && (
        <div className="flex flex-col items-end gap-1 ml-4 min-w-[120px]">
          {state === "idle" && (
            <Button
              variant="brand"
              size="action"
              onClick={handleContact}
            >
              {t.aiDiagnosis.contactProvider}
            </Button>
          )}
          {state === "sending" && (
            <Button variant="brand" size="action" disabled>
              {t.aiDiagnosis.jobRequestSending}
            </Button>
          )}
          {state === "sent" && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              {t.aiDiagnosis.jobRequestSent}
            </span>
          )}
          {state === "error" && (
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] text-red-500 text-right leading-tight max-w-[150px]">
                {t.aiDiagnosis.jobRequestError}
              </span>
              <Button
                variant="brand"
                size="action"
                onClick={handleContact}
              >
                {t.aiDiagnosis.retry}
              </Button>
            </div>
          )}
          {state === "duplicate" && (
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-right leading-tight max-w-[180px]">
              {t.aiDiagnosis.jobRequestDuplicate}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
