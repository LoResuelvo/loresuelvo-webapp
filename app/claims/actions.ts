"use server";

import { getAuthService } from "@/infrastructure/auth";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { ApiClaimRepository } from "@/infrastructure/repositories/claims/api-claim-repository";
import { ApiJobRequestRepository } from "@/infrastructure/repositories/messaging/api-job-request-repository";
import { ApiServiceProposalRepository } from "@/infrastructure/repositories/messaging/api-service-proposal-repository";
import { ApiWorkOrderRepository } from "@/infrastructure/repositories/work-orders/api-work-order-repository";
import { getClaimReferences } from "@/application/claims/get-claim-references";
import { submitClaim } from "@/application/claims/submit-claim";
import { isClaimUuid, normalizeClaimSubmission } from "@/domain/claim/validation";
import type { ClaimAcknowledgment, ClaimReferenceOption, ClaimSubmission } from "@/domain/claim/types";
import { t } from "@/infrastructure/i18n/translations";

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
    const references = await getClaimReferences(new ApiJobRequestRepository(), new ApiServiceProposalRepository(), workOrderId === undefined ? undefined : {workOrderId,orders:new ApiWorkOrderRepository()});
    return {ok:true,data:references.map(({reference,title}) => ({
      value:`${reference.kind}:${reference.id}`, reference,
      label:reference.kind === "job_request" ? `${t.claims.requestReference}: ${title}` : `${reference.kind === "work_order" ? t.claims.orderReference : t.claims.proposalReference} #${title}`,
    }))};
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
