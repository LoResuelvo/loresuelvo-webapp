"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ClaimActionResult } from "@/app/claims/actions";
import type { ClaimListCriteria, ClaimPage, ClaimStatus } from "@/domain/claim/types";
import { t } from "@/infrastructure/i18n/translations";
import { useClaimList } from "./useClaimList";

const PAGE_SIZE = 20;
const CLAIM_STATUSES = ["open", "in_review", "resolved", "dismissed"] as const satisfies readonly ClaimStatus[];
const CLAIM_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export interface ParticipantClaimsListProps {
  onListClaims: (criteria: ClaimListCriteria) => Promise<ClaimActionResult<ClaimPage>>;
  onOpenClaim?: (claimId: number, opener: HTMLButtonElement) => void;
  action?: ReactNode;
}

function formatClaimDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : CLAIM_DATE_FORMATTER.format(date);
}

function ClaimListField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function ClaimDates({
  createdOn,
  reviewStartedOn,
  closedOn,
}: {
  createdOn: string;
  reviewStartedOn: string | null;
  closedOn: string | null;
}) {
  return (
    <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
      <ClaimListField label={t.claims.list.createdDateLabel}>
        <time dateTime={createdOn}>{formatClaimDate(createdOn)}</time>
      </ClaimListField>
      {reviewStartedOn && (
        <ClaimListField label={t.claims.list.reviewDateLabel}>
          <time dateTime={reviewStartedOn}>{formatClaimDate(reviewStartedOn)}</time>
        </ClaimListField>
      )}
      {closedOn && (
        <ClaimListField label={t.claims.list.closedDateLabel}>
          <time dateTime={closedOn}>{formatClaimDate(closedOn)}</time>
        </ClaimListField>
      )}
    </dl>
  );
}

export function ParticipantClaimsList({ onListClaims, onOpenClaim, action }: ParticipantClaimsListProps) {
  const [status, setStatus] = useState<ClaimStatus | undefined>();
  const [page, setPage] = useState(1);
  const { state, retry } = useClaimList({ status, page, limit: PAGE_SIZE }, onListClaims);

  function handleStatusChange(value: string) {
    setStatus(CLAIM_STATUSES.find((candidate) => candidate === value));
    setPage(1);
  }

  const totalPages = state.status === "loaded"
    ? Math.max(1, Math.ceil(state.page.total / state.page.limit))
    : 1;

  return (
    <section
      aria-labelledby="claim-list-heading"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
          <h2 id="claim-list-heading" className="text-xl font-bold text-brand-primary">
            {t.claims.list.title}
          </h2>
          {action}
        </div>
        <div className="w-full space-y-2 sm:max-w-xs">
          <label htmlFor="claim-list-status" className="block text-sm font-semibold text-slate-800">
            {t.claims.list.filterLabel}
          </label>
          <select
            id="claim-list-status"
            data-testid="claim-list-status"
            value={status ?? ""}
            onChange={(event) => handleStatusChange(event.currentTarget.value)}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
          >
            <option value="">{t.claims.list.allStatuses}</option>
            {CLAIM_STATUSES.map((claimStatus) => (
              <option key={claimStatus} value={claimStatus}>{t.claims.list.statusOptions[claimStatus]}</option>
            ))}
          </select>
        </div>
      </div>

      {state.status === "loading" && (
        <p role="status" aria-live="polite" data-testid="claim-list-loading" className="py-8 text-center text-sm text-slate-600">
          {t.claims.list.loading}
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" data-testid="claim-list-error" className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{state.message}</p>
          <Button type="button" variant="brand" onClick={retry}>
            {t.claims.list.retry}
          </Button>
        </div>
      )}

      {state.status === "loaded" && state.page.items.length === 0 && (
        <p role="status" className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {t.claims.list.empty}
        </p>
      )}

      {state.status === "loaded" && state.page.items.length > 0 && (
        <ul aria-label={t.claims.list.title} className="space-y-4">
            {state.page.items.map((claim) => (
              <li key={claim.id}>
                <article className="rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-brand-primary">
                      {t.claims.list.claimTitle(claim.id)}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {t.claims.status[claim.status]}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ClaimListField label={t.claims.list.reasonLabel}>{t.claims.reasons[claim.reason]}</ClaimListField>
                    <ClaimListField label={t.claims.list.operationLabel}>{claim.operationId}</ClaimListField>
                  </dl>
                  <ClaimDates
                    createdOn={claim.createdOn}
                    reviewStartedOn={claim.reviewStartedOn}
                    closedOn={claim.closedOn}
                  />
                  {onOpenClaim && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={t.claims.list.openDetail(claim.id)}
                        onClick={(event) => onOpenClaim(claim.id, event.currentTarget)}
                      >
                        {t.claims.list.detailButtonLabel}
                      </Button>
                    </div>
                  )}
                </article>
              </li>
            ))}
        </ul>
      )}

      {state.status === "loaded" && (state.page.page > 1 || state.page.page < totalPages) && (
        <nav aria-label={t.claims.list.navigationLabel} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage(state.page.page - 1)}
            disabled={state.page.page <= 1}
          >
            {t.claims.list.previousPage}
          </Button>
          <span aria-live="polite" className="text-sm text-slate-600">
            {t.claims.list.pageLabel(state.page.page, totalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage(state.page.page + 1)}
            disabled={state.page.page >= totalPages}
          >
            {t.claims.list.nextPage}
          </Button>
        </nav>
      )}
    </section>
  );
}
