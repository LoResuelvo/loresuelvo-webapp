"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { ParticipantClaimForm, type ParticipantClaimFormProps } from "./ParticipantClaimForm";
import { ParticipantClaimsList, type ParticipantClaimsListProps } from "./ParticipantClaimsList";
import { ParticipantClaimDetailDialog, type ParticipantClaimDetailDialogProps } from "./ParticipantClaimDetailDialog";

export interface ParticipantClaimsWorkspaceProps extends ParticipantClaimFormProps {
  onListClaims: ParticipantClaimsListProps["onListClaims"];
  onGetClaim: ParticipantClaimDetailDialogProps["onGetClaim"];
  requestedReference?: string;
}

export function ParticipantClaimsWorkspace({
  references,
  initialReference,
  requestedReference,
  referencesError,
  onCreateClaim,
  onListClaims,
  onGetClaim,
}: ParticipantClaimsWorkspaceProps) {
  const [isFormOpen, setIsFormOpen] = useState(Boolean(requestedReference));
  const [listRevision, setListRevision] = useState(0);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const detailOpenerRef = useRef<HTMLButtonElement | null>(null);
  const formHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const shouldFocusFormHeading = useRef(false);
  const hasRequestedReference = Boolean(requestedReference);
  const hasAvailableInitialReference = references.some((option) => option.value === initialReference);
  const referenceContextUnavailable = Boolean(
    hasRequestedReference && !referencesError && !hasAvailableInitialReference,
  );

  useEffect(() => {
    setIsFormOpen(Boolean(requestedReference));
  }, [requestedReference]);

  useEffect(() => {
    if (!shouldFocusFormHeading.current) return;
    shouldFocusFormHeading.current = false;
    formHeadingRef.current?.focus();
  }, [isFormOpen]);

  async function createClaimAndRefreshList(
    ...args: Parameters<ParticipantClaimFormProps["onCreateClaim"]>
  ) {
    const result = await onCreateClaim(...args);
    if (result.ok) setListRevision((revision) => revision + 1);
    return result;
  }

  function openClaimDetail(claimId: number, opener: HTMLButtonElement) {
    detailOpenerRef.current = opener;
    setSelectedClaimId(claimId);
  }

  function toggleClaimForm() {
    if (isFormOpen) {
      setIsFormOpen(false);
      return;
    }

    shouldFocusFormHeading.current = true;
    setIsFormOpen(true);
  }

  function returnFocusToOpener(event: Event) {
    event.preventDefault();
    const opener = detailOpenerRef.current;
    if (opener?.isConnected) opener.focus();
    detailOpenerRef.current = null;
  }

  const formPanel = (
    <section
      id="claim-form-panel"
      aria-labelledby="claim-form-heading"
      hidden={!isFormOpen}
      className="space-y-4"
    >
      <h2
        id="claim-form-heading"
        ref={formHeadingRef}
        tabIndex={-1}
        className="text-xl font-bold text-brand-primary"
      >
        {t.claims.openForm}
      </h2>
      <ParticipantClaimForm
        key={requestedReference ?? "new-claim"}
        references={references}
        initialReference={initialReference}
        referenceContextUnavailable={referenceContextUnavailable}
        referencesError={referencesError}
        onCreateClaim={createClaimAndRefreshList}
      />
    </section>
  );

  const formToggle = (
    <Button
      type="button"
      variant="brand"
      data-testid="claim-form-toggle"
      aria-expanded={isFormOpen}
      aria-controls="claim-form-panel"
      onClick={toggleClaimForm}
    >
      {isFormOpen ? t.claims.closeForm : t.claims.openForm}
    </Button>
  );

  const claimsList = (
    <ParticipantClaimsList
      key={listRevision}
      action={formToggle}
      onListClaims={onListClaims}
      onOpenClaim={openClaimDetail}
    />
  );

  return (
    <>
      {hasRequestedReference ? (
        <>
          {formPanel}
          {claimsList}
        </>
      ) : (
        <>
          {claimsList}
          {formPanel}
        </>
      )}
      <ParticipantClaimDetailDialog
        claimId={selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
        onCloseAutoFocus={returnFocusToOpener}
        onGetClaim={onGetClaim}
      />
    </>
  );
}
