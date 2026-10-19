"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { normalizeClaimSubmission, validateClaimDescription } from "@/domain/claim/validation";
import type {
  ClaimAcknowledgment,
  ClaimReferenceOption,
  ClaimSubmission,
} from "@/domain/claim/types";
import type { ClaimActionResult } from "@/app/claims/actions";
import { t } from "@/infrastructure/i18n/translations";
import { useClaimEvidence } from "./useClaimEvidence";

export interface ParticipantClaimFormProps {
  references: ClaimReferenceOption[];
  initialReference?: string;
  referencesError?: boolean;
  onCreateClaim: (
    submission: ClaimSubmission,
    idempotencyKey: string
  ) => Promise<ClaimActionResult<ClaimAcknowledgment>>;
}

const REASONS = ["non_compliance", "improper_charge", "damage", "poor_quality"] as const;

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function ParticipantClaimForm({
  references,
  initialReference,
  referencesError = false,
  onCreateClaim,
}: ParticipantClaimFormProps) {
  const evidence = useClaimEvidence();
  const [referenceValue, setReferenceValue] = useState(() =>
    references.some((option) => option.value === initialReference) ? initialReference ?? "" : ""
  );
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [validationField, setValidationField] = useState<"reference" | "reason" | "description" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<ClaimAcknowledgment | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const referenceRef = useRef<HTMLSelectElement>(null);
  const focusReferenceAfterRestart = useRef(false);
  const descriptionLength = Array.from(description).length;
  const canSubmit = references.length > 0 && !referencesError;

  useEffect(() => {
    if (confirmation || !focusReferenceAfterRestart.current) return;
    focusReferenceAfterRestart.current = false;
    referenceRef.current?.focus();
  }, [confirmation]);

  function startNewClaim() {
    evidence.reset();
    idempotencyRef.current = null;
    setReason("");
    setDescription("");
    setFormError(null);
    setValidationField(null);
    focusReferenceAfterRestart.current = true;
    setConfirmation(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setValidationField(null);

    const selectedReference = references.find((option) => option.value === referenceValue);
    if (!selectedReference) {
      setFormError(t.claims.validation.reference);
      setValidationField("reference");
      return;
    }
    if (!REASONS.some((candidate) => candidate === reason)) {
      setFormError(t.claims.validation.reason);
      setValidationField("reason");
      return;
    }
    if (!validateClaimDescription(description)) {
      setFormError(t.claims.validation.description);
      setValidationField("description");
      return;
    }

    setSubmitting(true);
    try {
      const imageFileIds = await evidence.ensureUploaded();
      if (!imageFileIds) {
        setFormError(t.claims.evidenceInvalid);
        return;
      }

      const submission = normalizeClaimSubmission({
        reference: selectedReference.reference,
        reason: reason as ClaimSubmission["reason"],
        description,
        imageFileIds,
      });
      const fingerprint = JSON.stringify(submission);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = { fingerprint, key: createIdempotencyKey() };
      }

      const result = await onCreateClaim(submission, idempotencyRef.current.key);
      if (result.ok) {
        setConfirmation(result.data);
        return;
      }
      setFormError(t.claims.errors[result.error]);
    } catch {
      setFormError(t.claims.errors.unavailable);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <section
        aria-labelledby="claim-confirmation-heading"
        data-testid="claim-confirmation"
        className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
        role="status"
      >
        <h2 id="claim-confirmation-heading" className="text-xl font-bold text-brand-primary">
          {t.claims.confirmationTitle(confirmation.id)}
        </h2>
        <p className="mt-3 text-sm text-slate-700">{t.claims.status[confirmation.status]}</p>
        <p className="mt-1 text-sm text-slate-700">{t.claims.operation(confirmation.operationId)}</p>
        {evidence.items.length > 0 && (
          <p className="mt-1 text-sm text-slate-700">{t.claims.evidenceCount(evidence.items.length)}</p>
        )}
        <Button type="button" variant="brand" className="mt-5" onClick={startNewClaim}>
          {t.claims.newClaim}
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {referencesError ? (
        <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">
          {t.claims.referencesError}
        </p>
      ) : references.length === 0 ? (
        <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          {t.claims.noReferences}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="claim-reference" className="block text-sm font-semibold text-slate-800">
              {t.claims.referenceLabel}
            </label>
            <select
              ref={referenceRef}
              id="claim-reference"
              data-testid="claim-reference"
              value={referenceValue}
              onChange={(event) => { setReferenceValue(event.target.value); setFormError(null); setValidationField(null); }}
              aria-invalid={validationField === "reference"}
              aria-describedby={validationField === "reference" ? "claim-form-error" : undefined}
              disabled={submitting}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
              required
            >
              <option value="">{t.claims.referencePlaceholder}</option>
              {references.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="claim-reason" className="block text-sm font-semibold text-slate-800">
              {t.claims.reasonLabel}
            </label>
            <select
              id="claim-reason"
              data-testid="claim-reason"
              value={reason}
              onChange={(event) => { setReason(event.target.value); setFormError(null); setValidationField(null); }}
              aria-invalid={validationField === "reason"}
              aria-describedby={validationField === "reason" ? "claim-form-error" : undefined}
              disabled={submitting}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
              required
            >
              <option value="">{t.claims.reasonPlaceholder}</option>
              {REASONS.map((value) => <option key={value} value={value}>{t.claims.reasons[value]}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="claim-description" className="block text-sm font-semibold text-slate-800">
              {t.claims.descriptionLabel}
            </label>
            <textarea
              id="claim-description"
              data-testid="claim-description"
              value={description}
              onChange={(event) => { setDescription(event.target.value); setFormError(null); setValidationField(null); }}
              rows={6}
              aria-invalid={validationField === "description"}
              aria-describedby={validationField === "description" ? "claim-description-help claim-description-count claim-form-error" : "claim-description-help claim-description-count"}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
              required
            />
            <p id="claim-description-help" className="text-sm text-slate-600">{t.claims.descriptionHelp}</p>
            <p id="claim-description-count" className="text-right text-xs text-slate-500">
              {t.claims.descriptionCount(descriptionLength)}
            </p>
          </div>

          <section aria-labelledby="claim-evidence-heading" className="space-y-3">
            <div>
              <h2 id="claim-evidence-heading" className="text-sm font-semibold text-slate-800">
                {t.claims.evidenceLabel}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{t.claims.evidenceHelp}</p>
            </div>
            <label htmlFor="claim-evidence" className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-brand-primary hover:bg-slate-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-secondary">
              {t.claims.evidenceChoose}
              <input
                id="claim-evidence"
                data-testid="claim-evidence"
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(event) => {
                  if (event.currentTarget.files) evidence.addFiles(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
                disabled={submitting || evidence.items.length >= 3}
                className="sr-only"
              />
            </label>
            {evidence.validationError && <p role="alert" className="text-sm text-rose-700">{evidence.validationError}</p>}
            {evidence.items.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t.claims.evidenceLabel}>
                {evidence.items.map((item, index) => (
                  <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                    {item.previewUrl && <img src={item.previewUrl} alt={t.claims.evidencePreview(item.file.name)} className="size-14 shrink-0 rounded-md object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{item.file.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {item.status === "uploading" ? t.claims.evidenceUploading : item.status === "uploaded" ? t.claims.evidenceUploaded : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t.claims.evidenceRemove(item.file.name)}
                      data-testid={`claim-evidence-remove-${index}`}
                      onClick={() => evidence.remove(item.id)}
                      disabled={submitting}
                    >
                      <span aria-hidden="true">×</span>
                    </Button>
                    {item.status === "failed" && (
                      <p role="alert" data-testid="claim-upload-error" className="basis-full text-sm text-rose-700">
                        {t.claims.evidenceUploadError(item.file.name)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {formError && <p id="claim-form-error" role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{formError}</p>}
          <Button
            type="submit"
            variant="brand"
            size="lg"
            data-testid="claim-submit"
            disabled={!canSubmit || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? t.claims.submitting : t.claims.submit}
          </Button>
        </>
      )}
    </form>
  );
}
