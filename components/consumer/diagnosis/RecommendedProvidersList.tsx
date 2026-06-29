import React from "react";
import { RecommendedProvider, ProblemAssessment } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";
import InfoBanner from "@/components/messaging/InfoBanner";
import { cn } from "@/lib/utils";
import { RecommendedProviderCard } from "./RecommendedProviderCard";

interface RecommendedProvidersListProps {
  providers?: RecommendedProvider[];
  diagnosisCompleted?: boolean;
  assessment?: ProblemAssessment;
  onContactProvider?: (providerId: number) => Promise<void>;
  className?: string;
}

export function RecommendedProvidersList({
  providers,
  diagnosisCompleted,
  assessment,
  onContactProvider,
  className,
}: RecommendedProvidersListProps) {
  const showList = assessment ? assessment.outcome === "professional_required" : diagnosisCompleted;

  if (!showList) {
    return null;
  }

  if (!providers || providers.length === 0) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <h3 className="text-lg font-semibold">{t.aiDiagnosis.recommendedProviders}</h3>
        <InfoBanner tone="info">{t.aiDiagnosis.noProvidersFound}</InfoBanner>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h3 className="text-lg font-semibold">{t.aiDiagnosis.recommendedProviders}</h3>
      <div className="flex flex-col gap-3">
        {providers.map((provider) => (
          <RecommendedProviderCard
            key={provider.id}
            provider={provider}
            assessment={assessment}
            onContactProvider={onContactProvider}
          />
        ))}
      </div>
    </div>
  );
}
