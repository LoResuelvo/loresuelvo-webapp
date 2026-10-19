"use client";

import { useEffect, useState } from "react";
import type { ClaimActionError, ClaimActionResult } from "@/app/claims/actions";
import type { ClaimListCriteria, ClaimPage } from "@/domain/claim/types";
import { t } from "@/infrastructure/i18n/translations";

type ClaimListState =
  | { status: "loading" }
  | { status: "loaded"; page: ClaimPage }
  | { status: "error"; message: string };

type ListClaims = (criteria: ClaimListCriteria) => Promise<ClaimActionResult<ClaimPage>>;

function getListErrorMessage(error: ClaimActionError): string {
  switch (error) {
    case "unauthenticated":
      return t.claims.list.errors.unauthenticated;
    case "forbidden":
      return t.claims.list.errors.forbidden;
    case "not_found":
      return t.claims.list.errors.not_found;
    case "invalid":
      return t.claims.list.errors.invalid;
    default:
      return t.claims.list.errors.unavailable;
  }
}

export function useClaimList(criteria: ClaimListCriteria, onListClaims: ListClaims) {
  const status = criteria.status;
  const page = criteria.page ?? 1;
  const limit = criteria.limit ?? 20;
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = `${status ?? "all"}:${page}:${limit}:${retryCount}`;
  const [requestState, setRequestState] = useState<{
    requestKey: string;
    state: ClaimListState;
  }>({ requestKey: "", state: { status: "loading" } });

  useEffect(() => {
    let isCurrentRequest = true;
    setRequestState({ requestKey, state: { status: "loading" } });

    async function loadClaims() {
      const listCriteria: ClaimListCriteria = {
        page,
        limit,
        ...(status ? { status } : {}),
      };

      try {
        const result = await onListClaims(listCriteria);
        if (!isCurrentRequest) return;

        setRequestState({
          requestKey,
          state: result.ok
            ? { status: "loaded", page: result.data }
            : { status: "error", message: getListErrorMessage(result.error) },
        });
      } catch {
        if (!isCurrentRequest) return;
        setRequestState({
          requestKey,
          state: { status: "error", message: t.claims.list.errors.unavailable },
        });
      }
    }

    void loadClaims();
    return () => {
      isCurrentRequest = false;
    };
  }, [limit, onListClaims, page, requestKey, status]);

  return {
    state: requestState.requestKey === requestKey ? requestState.state : { status: "loading" as const },
    retry: () => setRetryCount((currentCount) => currentCount + 1),
  };
}
