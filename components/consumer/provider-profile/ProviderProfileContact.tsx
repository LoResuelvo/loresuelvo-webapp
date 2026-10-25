"use client";

import { useState } from "react";
import type { ProviderProfile } from "@/domain/provider/types";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import WorkRequestModal from "@/components/consumer/search/work-request/WorkRequestModal";

interface ProviderProfileContactProps {
  provider: ProviderProfile;
}

export default function ProviderProfileContact({ provider }: ProviderProfileContactProps) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="brand" onClick={() => setIsRequestOpen(true)}>
        {t.consumerUx.providerProfile.requestButton}
      </Button>
      {isRequestOpen ? (
        <WorkRequestModal provider={provider} onClose={() => setIsRequestOpen(false)} />
      ) : null}
    </>
  );
}
