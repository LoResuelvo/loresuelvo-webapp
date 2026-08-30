import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { t } from "@/infrastructure/i18n/translations";

export interface ProposalPricingSectionProps {
  amount: string;
  onChangeAmount: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function ProposalPricingSection({
  amount,
  onChangeAmount,
  error,
  disabled = false,
}: ProposalPricingSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="amount">{t.messaging.serviceProposal.amountLabel}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder={t.messaging.serviceProposal.amountPlaceholder}
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value)}
          className={`pl-8 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          disabled={disabled}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 font-medium animate-in fade-in duration-200">
          {error}
        </p>
      )}
    </div>
  );
}
