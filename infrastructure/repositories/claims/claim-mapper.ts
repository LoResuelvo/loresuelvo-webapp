import { z } from "zod";
import type { ApiClaimAcknowledgment, ApiClaimReference, ApiClaimSubmission } from "@/infrastructure/api/types";
import type { ClaimAcknowledgment, ClaimReference, ClaimSubmission } from "@/domain/claim/types";
const id = z.number().int().positive().max(2147483647);
const referenceSchema = z.union([
  z.object({job_request_id:id}).strict(), z.object({service_proposal_id:id}).strict(),
  z.object({work_order_id:id}).strict(), z.object({payment_intent_id:z.string().uuid()}).strict(),
]);
const acknowledgmentSchema = z.object({
  id, operation_id:z.string().regex(/^(jr|sp)-[1-9][0-9]*$/), reference:referenceSchema,
  status:z.enum(["open","in_review","resolved","dismissed"]), created_on:z.string().datetime({offset:true}),
});
export function toApiClaimReference(reference: ClaimReference): ApiClaimReference {
  switch (reference.kind) {
    case "job_request": return {job_request_id:reference.id};
    case "service_proposal": return {service_proposal_id:reference.id};
    case "work_order": return {work_order_id:reference.id};
    case "payment_intent": return {payment_intent_id:reference.id};
  }
}
export function fromApiClaimReference(reference: ApiClaimReference): ClaimReference {
  if ("job_request_id" in reference) return {kind:"job_request",id:reference.job_request_id};
  if ("service_proposal_id" in reference) return {kind:"service_proposal",id:reference.service_proposal_id};
  if ("work_order_id" in reference) return {kind:"work_order",id:reference.work_order_id};
  return {kind:"payment_intent",id:reference.payment_intent_id};
}
export function toApiClaimSubmission(input: ClaimSubmission): ApiClaimSubmission {
  return {reference:toApiClaimReference(input.reference),reason:input.reason,description:input.description,image_file_ids:input.imageFileIds};
}
export function mapClaimAcknowledgment(dto: ApiClaimAcknowledgment): ClaimAcknowledgment {
  const value = acknowledgmentSchema.parse(dto);
  return {id:value.id,operationId:value.operation_id,reference:fromApiClaimReference(value.reference),status:value.status,createdOn:value.created_on};
}
