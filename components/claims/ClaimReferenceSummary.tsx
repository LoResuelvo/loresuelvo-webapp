import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import type { ClaimReference, ClaimReferenceOption, ClaimReferenceStatus } from "@/domain/claim/types";
import { t } from "@/infrastructure/i18n/translations";

const REFERENCE_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getReferenceKindLabel(reference: ClaimReference): string {
  switch (reference.kind) {
    case "job_request":
      return t.claims.requestReference;
    case "service_proposal":
      return t.claims.proposalReference;
    case "work_order":
      return t.claims.orderReference;
    case "payment_intent":
      return t.claims.paymentReference;
  }
}

function getStatusLabel(status: ClaimReferenceStatus): string {
  return t.claims.referenceStatuses[status];
}

function getPersonLabel(option: ClaimReferenceOption): string {
  if (option.context.personRole === "requester") return t.claims.referenceRequester;
  if (option.context.personRole === "counterpart") return t.claims.referenceCounterpart;
  return t.claims.referencePerson;
}

function formatScheduledOn(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : REFERENCE_DATE_FORMATTER.format(date);
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function formatClaimReferenceLabel(option: ClaimReferenceOption): string {
  const { context, reference } = option;
  const parts = [`${getReferenceKindLabel(reference)}: ${truncate(context.title, 50)}`];

  if (context.description && context.description !== context.title) {
    parts.push(truncate(context.description, 40));
  }
  if (context.person) {
    parts.push(`${getPersonLabel(option)}: ${truncate(context.person, 30)}`);
  }
  if (context.scheduledOn) {
    parts.push(`${t.claims.referenceDate}: ${formatScheduledOn(context.scheduledOn)}`);
  }
  if (context.status) {
    parts.push(`${t.claims.referenceStatus}: ${getStatusLabel(context.status)}`);
  }
  parts.push(t.claims.referenceNumber(reference.id));

  return parts.join(" · ");
}

export interface ClaimReferenceSummaryProps {
  option: ClaimReferenceOption;
  canChangeReference?: boolean;
  disabled?: boolean;
  onChangeReference?: () => void;
  changeReferenceButtonRef?: Ref<HTMLButtonElement>;
}

export function ClaimReferenceSummary({
  option,
  canChangeReference = false,
  disabled = false,
  onChangeReference,
  changeReferenceButtonRef,
}: ClaimReferenceSummaryProps) {
  const { context, reference } = option;

  return (
    <section
      aria-labelledby="claim-reference-context-heading"
      className="space-y-3 rounded-xl border border-brand-primary/15 bg-brand-neutral/20 p-4"
      data-testid="claim-reference-context"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="claim-reference-context-heading" className="text-sm font-semibold text-brand-primary">
            {t.claims.referenceContextTitle}
          </h2>
        </div>
        {canChangeReference && onChangeReference && (
          <Button
            ref={changeReferenceButtonRef}
            type="button"
            variant="outline"
            onClick={onChangeReference}
            disabled={disabled}
          >
            {t.claims.changeReference}
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <p className="break-words font-semibold text-slate-900">{context.title}</p>
        {context.description && context.description !== context.title && (
          <p className="break-words text-sm text-slate-700">{context.description}</p>
        )}
      </div>

      <p className="text-xs text-slate-600">
        {getReferenceKindLabel(reference)} · {t.claims.referenceNumber(reference.id)}
      </p>

      {(context.person || context.scheduledOn || context.status) && (
        <dl className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-3">
          {context.person && (
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {getPersonLabel(option)}
              </dt>
              <dd className="mt-1 break-words text-sm text-slate-800">{context.person}</dd>
            </div>
          )}
          {context.scheduledOn && (
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.claims.referenceDate}
              </dt>
              <dd className="mt-1 break-words text-sm text-slate-800">
                {formatScheduledOn(context.scheduledOn)}
              </dd>
            </div>
          )}
          {context.status && (
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.claims.referenceStatus}
              </dt>
              <dd className="mt-1 break-words text-sm text-slate-800">
                {getStatusLabel(context.status)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
