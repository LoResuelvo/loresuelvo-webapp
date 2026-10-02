import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from "@/infrastructure/i18n/translations";

export function ProviderIdentityBadge({ identityVerified }: { identityVerified: boolean }) {
  if (identityVerified !== true) return null;

  return (
    <Badge variant="success" className="max-w-full gap-1">
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{t.consumerSearch.identityVerified}</span>
    </Badge>
  );
}
