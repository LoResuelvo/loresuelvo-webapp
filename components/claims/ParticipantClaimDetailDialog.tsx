"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ClaimActionError, ClaimActionResult } from "@/app/claims/actions";
import type { ClaimDetail } from "@/domain/claim/types";
import { t } from "@/infrastructure/i18n/translations";

const CLAIM_DETAIL_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});
const CLAIM_COMPENSATION_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

type ClaimDetailState =
  | { status: "loading" }
  | {
      status: "loaded";
      detail: ClaimDetail;
      failedImageFileIds: string[];
    }
  | { status: "error"; message: string };

type ClaimDetailAction = (id: number) => Promise<ClaimActionResult<ClaimDetail>>;

export interface ParticipantClaimDetailDialogProps {
  claimId: number | null;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  onGetClaim: ClaimDetailAction;
}

function getDetailErrorMessage(error: ClaimActionError): string {
  switch (error) {
    case "unauthenticated":
      return t.claims.detail.errors.unauthenticated;
    case "forbidden":
      return t.claims.detail.errors.forbidden;
    case "not_found":
      return t.claims.detail.errors.not_found;
    case "invalid":
      return t.claims.detail.errors.invalid;
    default:
      return t.claims.detail.errors.unavailable;
  }
}

function formatClaimDetailDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : CLAIM_DETAIL_DATE_FORMATTER.format(date);
}

function ClaimDetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function ClaimDetailDates({ detail }: { detail: ClaimDetail }) {
  return (
    <dl className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <ClaimDetailField label={t.claims.detail.createdDateLabel}>
        <time dateTime={detail.createdOn}>{formatClaimDetailDate(detail.createdOn)}</time>
      </ClaimDetailField>
      {detail.reviewStartedOn && (
        <ClaimDetailField label={t.claims.detail.reviewDateLabel}>
          <time dateTime={detail.reviewStartedOn}>{formatClaimDetailDate(detail.reviewStartedOn)}</time>
        </ClaimDetailField>
      )}
      {detail.closedOn && (
        <ClaimDetailField label={t.claims.detail.closedDateLabel}>
          <time dateTime={detail.closedOn}>{formatClaimDetailDate(detail.closedOn)}</time>
        </ClaimDetailField>
      )}
      {detail.resolution && (
        <ClaimDetailField label={t.claims.detail.resolvedDateLabel}>
          <time dateTime={detail.resolution.resolvedOn}>{formatClaimDetailDate(detail.resolution.resolvedOn)}</time>
        </ClaimDetailField>
      )}
    </dl>
  );
}

function ClaimResolution({ detail }: { detail: ClaimDetail }) {
  if (!detail.resolution) {
    return (
      <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {t.claims.detail.noResolution}
      </p>
    );
  }

  const { resolution } = detail;
  return (
    <section aria-labelledby="claim-resolution-heading" className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h3 id="claim-resolution-heading" className="text-base font-semibold text-brand-primary">
        {t.claims.detail.resolutionTitle}
      </h3>
      <dl className="space-y-3">
        <ClaimDetailField label={t.claims.detail.resolutionTypeLabel}>
          {t.claims.detail.resolutionTypes[resolution.type]}
        </ClaimDetailField>
        <ClaimDetailField label={t.claims.detail.reasoningLabel}>
          {resolution.reasoning}
        </ClaimDetailField>
        {resolution.suggestedCompensation && (
          <ClaimDetailField label={t.claims.detail.suggestedCompensationLabel}>
            {CLAIM_COMPENSATION_FORMATTER.format(resolution.suggestedCompensation.amountMinor / 100)}
          </ClaimDetailField>
        )}
      </dl>
    </section>
  );
}

function getSafeEvidenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function ClaimEvidence({
  detail,
  failedImageFileIds,
  onImageError,
  onRetry,
}: {
  detail: ClaimDetail;
  failedImageFileIds: string[];
  onImageError: (fileId: string) => void;
  onRetry: () => void;
}) {
  if (detail.images.length === 0) return null;

  return (
    <section aria-labelledby="claim-evidence-heading" className="space-y-3">
      <h3 id="claim-evidence-heading" className="text-sm font-semibold text-slate-800">
        {t.claims.detail.evidenceTitle}
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {detail.images.map((image, index) => {
          const source = getSafeEvidenceUrl(image.url);
          const failed = !source || failedImageFileIds.includes(image.fileId);
          const alt = t.claims.detail.evidenceAlt(index + 1);
          return (
            <li key={image.fileId} className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
              {failed ? (
                <div role="group" aria-label={alt} className="flex min-h-44 flex-col items-center justify-center gap-3 bg-slate-50 p-4 text-center">
                  <p role="alert" className="text-sm text-slate-700">{t.claims.detail.imageUnavailable}</p>
                  <Button type="button" variant="outline" onClick={onRetry}>
                    {t.claims.detail.refreshEvidence}
                  </Button>
                </div>
              ) : (
                <img
                  key={image.fileId}
                  src={source}
                  alt={alt}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => onImageError(image.fileId)}
                  className="max-h-80 w-full object-contain"
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ClaimDetailContent({
  detail,
  failedImageFileIds,
  onImageError,
  onRetry,
}: {
  detail: ClaimDetail;
  failedImageFileIds: string[];
  onImageError: (fileId: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-5" data-testid="claim-detail-content">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.claims.detail.reasonLabel}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{t.claims.reasons[detail.reason]}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {t.claims.status[detail.status]}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <ClaimDetailField label={t.claims.detail.operationLabel}>{detail.operationId}</ClaimDetailField>
      </dl>

      <ClaimDetailDates detail={detail} />

      <section aria-labelledby="claim-description-heading" className="space-y-2">
        <h3 id="claim-description-heading" className="text-sm font-semibold text-slate-800">
          {t.claims.detail.descriptionLabel}
        </h3>
        <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {detail.description}
        </p>
      </section>

      <ClaimResolution detail={detail} />

      <ClaimEvidence
        detail={detail}
        failedImageFileIds={failedImageFileIds}
        onImageError={onImageError}
        onRetry={onRetry}
      />
    </div>
  );
}

export function ParticipantClaimDetailDialog({ claimId, onClose, onCloseAutoFocus, onGetClaim }: ParticipantClaimDetailDialogProps) {
  const [retryCount, setRetryCount] = useState(0);
  const requestGenerationRef = useRef(0);
  const [requestState, setRequestState] = useState<{ claimId: number | null; retryCount: number; state: ClaimDetailState }>({
    claimId: null,
    retryCount: -1,
    state: { status: "loading" },
  });

  useEffect(() => {
    if (claimId === null) {
      setRequestState({ claimId: null, retryCount, state: { status: "loading" } });
      return;
    }

    const targetClaimId = claimId;
    let isCurrentRequest = true;
    const requestGeneration = ++requestGenerationRef.current;
    setRequestState({ claimId: targetClaimId, retryCount, state: { status: "loading" } });

    async function loadClaimDetail() {
      try {
        const result = await onGetClaim(targetClaimId);
        if (!isCurrentRequest || requestGeneration !== requestGenerationRef.current) return;
        setRequestState({
          claimId: targetClaimId,
          retryCount,
          state: result.ok
            ? {
                status: "loaded",
                detail: result.data,
                failedImageFileIds: [],
              }
            : { status: "error", message: getDetailErrorMessage(result.error) },
        });
      } catch {
        if (!isCurrentRequest || requestGeneration !== requestGenerationRef.current) return;
        setRequestState({ claimId: targetClaimId, retryCount, state: { status: "error", message: t.claims.detail.errors.unavailable } });
      }
    }

    void loadClaimDetail();
    return () => {
      isCurrentRequest = false;
      if (requestGeneration === requestGenerationRef.current) requestGenerationRef.current += 1;
    };
  }, [claimId, onGetClaim, retryCount]);

  const state = claimId !== null && requestState.claimId === claimId && requestState.retryCount === retryCount
    ? requestState.state
    : { status: "loading" as const };

  function markImageAsFailed(fileId: string) {
    if (claimId === null) return;
    setRequestState((current) => {
      if (current.claimId !== claimId || current.retryCount !== retryCount || current.state.status !== "loaded" || current.state.failedImageFileIds.includes(fileId)) {
        return current;
      }
      return {
        claimId,
        retryCount,
        state: { ...current.state, failedImageFileIds: [...current.state.failedImageFileIds, fileId] },
      };
    });
  }

  return (
    <Modal
      open={claimId !== null}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={claimId === null ? t.claims.detail.closedTitle : t.claims.detail.title(claimId)}
      closeLabel={t.claims.detail.close}
      className="max-w-2xl"
      bodyClassName="p-5 sm:p-6"
    >
      {claimId !== null && state.status === "loading" && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm text-slate-600">
          {t.claims.detail.loading}
        </p>
      )}
      {claimId !== null && state.status === "error" && (
        <div role="alert" data-testid="claim-detail-error" className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{state.message}</p>
          <Button type="button" variant="brand" onClick={() => setRetryCount((count) => count + 1)}>
            {t.claims.detail.retry}
          </Button>
        </div>
      )}
      {claimId !== null && state.status === "loaded" && (
        <ClaimDetailContent
          detail={state.detail}
          failedImageFileIds={state.failedImageFileIds}
          onImageError={markImageAsFailed}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      )}
    </Modal>
  );
}
