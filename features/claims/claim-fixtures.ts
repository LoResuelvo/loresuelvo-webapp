import type { ApiClaimSummary, ApiClaimPage, ApiClaimDetail } from "../../infrastructure/api/types";

export function aClaimSummary(overrides: Partial<ApiClaimSummary> = {}): ApiClaimSummary {
  return {
    id: 321,
    operation_id: "jr-47",
    reference: { job_request_id: 47 },
    reason: "damage",
    status: "open",
    created_on: "2026-10-19T12:00:00Z",
    review_started_on: null,
    closed_on: null,
    ...overrides,
  };
}

export function aClaimPage(items: ApiClaimSummary[], page = 1, total = items.length): ApiClaimPage {
  return { items, page, limit: 20, total };
}

export function aClaimDetail(overrides: Partial<ApiClaimDetail> = {}): ApiClaimDetail {
  return {
    ...aClaimSummary(),
    description: "El servicio no se realizó y no pude resolver el problema con la contraparte.",
    images: [],
    resolution: null,
    ...overrides,
  };
}
