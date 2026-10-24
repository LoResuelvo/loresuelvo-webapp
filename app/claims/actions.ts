"use server";

import { getAuthService } from "@/infrastructure/auth";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { ApiClaimRepository } from "@/infrastructure/repositories/claims/api-claim-repository";
import { ApiJobRequestRepository } from "@/infrastructure/repositories/messaging/api-job-request-repository";
import { ApiServiceProposalRepository } from "@/infrastructure/repositories/messaging/api-service-proposal-repository";
import { ApiWorkOrderRepository } from "@/infrastructure/repositories/work-orders/api-work-order-repository";
import { getClaimReferences } from "@/application/claims/get-claim-references";
import { getClaimDetail, isClaimId } from "@/application/claims/get-claim-detail";
import { submitClaim } from "@/application/claims/submit-claim";
import { isClaimListCriteria, listClaims } from "@/application/claims/list-claims";
import { isClaimUuid, normalizeClaimSubmission } from "@/domain/claim/validation";
import type { ClaimAcknowledgment, ClaimReferenceOption, ClaimSubmission, ClaimListCriteria, ClaimPage, ClaimDetail } from "@/domain/claim/types";

export type ClaimActionError = "unauthenticated" | "forbidden" | "not_found" | "unfinished_claim" | "key_conflict" | "invalid" | "unavailable";
export type ClaimActionResult<T> = {ok:true;data:T} | {ok:false;status:number|null;error:ClaimActionError};

async function authorize(): Promise<ClaimActionResult<true>> {
  const session = await getAuthService().getSession();
  if (!session) return {ok:false,status:401,error:"unauthenticated"};
  if (session.user.role !== "consumer" && session.user.role !== "provider") return {ok:false,status:403,error:"forbidden"};
  return {ok:true,data:true};
}
function failure(error: unknown): ClaimActionResult<never> {
  if (!(error instanceof ApiClientError)) return {ok:false,status:null,error:"unavailable"};
  const status = error.status;
  if (status === 401) return {ok:false,status,error:"unauthenticated"};
  if (status === 403) return {ok:false,status,error:"forbidden"};
  if (status === 404) return {ok:false,status,error:"not_found"};
  if (status === 400) return {ok:false,status,error:"invalid"};
  if (status === 409) return {ok:false,status,error:error.message === "claim submission key already used with different content" ? "key_conflict" : "unfinished_claim"};
  return {ok:false,status,error:"unavailable"};
}
export async function listClaimReferencesAction(workOrderId?: number): Promise<ClaimActionResult<ClaimReferenceOption[]>> {
  try {
    const access = await authorize();
    if (!access.ok) return access;
    if (workOrderId !== undefined && (!Number.isInteger(workOrderId) || workOrderId <= 0 || workOrderId > 2147483647)) return {ok:false,status:400,error:"invalid"};
    const orderContext = workOrderId === undefined
      ? undefined
      : { workOrderId, orders: new ApiWorkOrderRepository() };
    const references = await getClaimReferences(
      new ApiJobRequestRepository(),
      new ApiServiceProposalRepository(),
      orderContext,
    );

    return {
      ok: true,
      data: references.map(({ reference, context }) => ({
        value: `${reference.kind}:${reference.id}`,
        reference,
        context,
      })),
    };
  } catch (error: unknown) { return failure(error); }
}
export async function createClaimAction(input: ClaimSubmission, idempotencyKey: string): Promise<ClaimActionResult<ClaimAcknowledgment>> {
  try {
    const access = await authorize();
    if (!access.ok) return access;
    try {
      normalizeClaimSubmission(input);
      if (!isClaimUuid(idempotencyKey)) throw new Error("Invalid key");
    } catch { return {ok:false,status:400,error:"invalid"}; }
    const data = await submitClaim(new ApiClaimRepository(), input, idempotencyKey);
    return {ok:true,data};
  } catch (error: unknown) { return failure(error); }
}
export async function listClaimsAction(criteria: ClaimListCriteria = {}): Promise<ClaimActionResult<ClaimPage>> {
  try {
    const access = await authorize();
    if (!access.ok) return access;
    if (!isClaimListCriteria(criteria)) return {ok:false,status:400,error:"invalid"};
    return {ok:true,data:await listClaims(new ApiClaimRepository(),criteria)};
  } catch (error: unknown) { return failure(error); }
}

export async function getClaimDetailAction(id: number): Promise<ClaimActionResult<ClaimDetail>> {
  try {
    const access = await authorize();
    if (!access.ok) return access;
    if (!isClaimId(id)) return {ok:false,status:400,error:"invalid"};
    return {ok:true,data:await getClaimDetail(new ApiClaimRepository(),id)};
  } catch (error: unknown) { return failure(error); }
}
