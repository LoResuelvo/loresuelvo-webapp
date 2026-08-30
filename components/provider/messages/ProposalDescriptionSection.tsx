import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/infrastructure/i18n/translations";

export interface ProposalDescriptionSectionProps {
  description: string;
  onChangeDescription: (value: string) => void;
  disabled?: boolean;
}

export function ProposalDescriptionSection({
  description,
  onChangeDescription,
  disabled = false,
}: ProposalDescriptionSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="description">{t.messaging.serviceProposal.descriptionLabel}</Label>
      <Textarea
        id="description"
        placeholder={t.messaging.serviceProposal.descriptionPlaceholder}
        value={description}
        onChange={(e) => onChangeDescription(e.target.value)}
        className="min-h-[160px] resize-none"
        disabled={disabled}
      />
    </div>
  );
}
