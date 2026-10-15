import { Input } from "@/components/ui/input";
import { t } from "@/infrastructure/i18n/translations";

interface StatisticsDateFieldsProps {
  readonly from: string;
  readonly through: string;
  readonly onFromChange: (value: string) => void;
  readonly onThroughChange: (value: string) => void;
  readonly helpId: string;
  readonly required?: boolean;
}

export function StatisticsDateFields({ from, through, onFromChange, onThroughChange, helpId, required }: StatisticsDateFieldsProps) {
  return (
    <>
      <label className="space-y-1 text-sm">
        {t.providerActivity.from}
        <Input type="date" required={required} value={from} onChange={event => onFromChange(event.target.value)} aria-describedby={helpId} />
      </label>
      <label className="space-y-1 text-sm">
        {t.providerActivity.through}
        <Input type="date" required={required} value={through} onChange={event => onThroughChange(event.target.value)} aria-describedby={helpId} />
      </label>
    </>
  );
}
