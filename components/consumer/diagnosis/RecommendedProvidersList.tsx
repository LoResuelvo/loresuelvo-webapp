import React from "react";
import { useRouter } from "next/navigation";
import { RecommendedProvider } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import InfoBanner from "@/components/messaging/InfoBanner";

interface RecommendedProvidersListProps {
  providers?: RecommendedProvider[];
  diagnosisCompleted?: boolean;
}

export function RecommendedProvidersList({ providers, diagnosisCompleted }: RecommendedProvidersListProps) {
  const router = useRouter();

  if (!diagnosisCompleted) {
    return null;
  }

  if (!providers || providers.length === 0) {
    return (
      <div className="flex flex-col gap-4 mt-6">
        <h3 className="text-lg font-semibold">{t.aiDiagnosis.recommendedProviders}</h3>
        <InfoBanner tone="info">{t.aiDiagnosis.noProvidersFound}</InfoBanner>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-6">
      <h3 className="text-lg font-semibold">{t.aiDiagnosis.recommendedProviders}</h3>
      <div className="flex flex-col gap-3">
        {providers.map((provider) => (
          <Card key={provider.id} variant="interactive" className="flex flex-row items-center p-4">
            <Avatar
              size="md"
              src={provider.profilePhotoUrl}
              alt={`${provider.name} ${provider.surname}`}
              initials={`${provider.name.charAt(0)}${provider.surname.charAt(0)}`}
              imgTestId={`avatar-img-${provider.id}`}
              fallbackTestId={`avatar-fallback-${provider.id}`}
            />
            <div className="flex flex-col ml-4">
              <span className="font-semibold text-base">{provider.name} {provider.surname}</span>
              <span className="text-sm text-slate-500">{provider.categoryName}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
