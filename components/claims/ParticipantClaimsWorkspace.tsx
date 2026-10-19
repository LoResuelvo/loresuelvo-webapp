"use client";

import { useRef, useState } from "react";
import { ParticipantClaimForm, type ParticipantClaimFormProps } from "./ParticipantClaimForm";
import { ParticipantClaimsList, type ParticipantClaimsListProps } from "./ParticipantClaimsList";
import { ParticipantClaimDetailDialog, type ParticipantClaimDetailDialogProps } from "./ParticipantClaimDetailDialog";

export interface ParticipantClaimsWorkspaceProps extends ParticipantClaimFormProps {
  onListClaims: ParticipantClaimsListProps["onListClaims"];
  onGetClaim: ParticipantClaimDetailDialogProps["onGetClaim"];
}

export function ParticipantClaimsWorkspace({
  references,
  initialReference,
  referencesError,
  onCreateClaim,
  onListClaims,
  onGetClaim,
}: ParticipantClaimsWorkspaceProps) {
  const [listRevision, setListRevision] = useState(0);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const detailOpenerRef = useRef<HTMLButtonElement | null>(null);

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

  function returnFocusToOpener(event: Event) {
    event.preventDefault();
    const opener = detailOpenerRef.current;
    if (opener?.isConnected) opener.focus();
    detailOpenerRef.current = null;
  }

  return (
    <>
      <ParticipantClaimForm
        references={references}
        initialReference={initialReference}
        referencesError={referencesError}
        onCreateClaim={createClaimAndRefreshList}
      />
      <ParticipantClaimsList key={listRevision} onListClaims={onListClaims} onOpenClaim={openClaimDetail} />
      <ParticipantClaimDetailDialog
        claimId={selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
        onCloseAutoFocus={returnFocusToOpener}
        onGetClaim={onGetClaim}
      />
    </>
  );
}
