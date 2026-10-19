import { z } from "zod";
import type { ApiClaimAcknowledgment, ApiClaimReference, ApiClaimSubmission, ApiClaimPage, ApiClaimDetail } from "@/infrastructure/api/types";
import type { ClaimAcknowledgment, ClaimReference, ClaimSubmission, ClaimPage, ClaimDetail } from "@/domain/claim/types";
const id = z.number().int().positive().max(2147483647);
const referenceSchema = z.union([
  z.object({job_request_id:id}).strict(), z.object({service_proposal_id:id}).strict(),
  z.object({work_order_id:id}).strict(), z.object({payment_intent_id:z.string().uuid()}).strict(),
]);
const acknowledgmentSchema = z.object({
  id, operation_id:z.string().regex(/^(jr|sp)-[1-9][0-9]*$/), reference:referenceSchema,
  status:z.enum(["open","in_review","resolved","dismissed"]), created_on:z.string().datetime({offset:true}),
});
const summarySchema = acknowledgmentSchema.extend({
  reason: z.enum(["non_compliance", "improper_charge", "damage", "poor_quality"]),
  review_started_on: z.string().datetime({offset:true}).nullable(),
  closed_on: z.string().datetime({offset:true}).nullable(),
});
const pageSchema = z.object({
  items: z.array(summarySchema), page: id,
  limit: z.number().int().min(1).max(100), total: z.number().int().nonnegative().safe(),
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
export function mapClaimPage(dto: ApiClaimPage): ClaimPage {
  const value = pageSchema.parse(dto);
  return {
    items: value.items.map(item => ({
      ...mapClaimAcknowledgment(item), reason: item.reason,
      reviewStartedOn: item.review_started_on, closedOn: item.closed_on,
    })),
    page: value.page, limit: value.limit, total: value.total,
  };
}

const resolutionSchema = z.object({
  type: z.enum(["consumer_favor", "provider_favor", "agreement", "without_merit"]),
  reasoning: z.string(),
  resolved_on: z.string().datetime({ offset: true }),
  suggested_compensation: z.object({
    amount_minor: z.number().int().positive().safe(),
    currency: z.literal("ARS"),
    unit: z.literal("minor"),
  }).nullable(),
});
const detailSchema = summarySchema.extend({
  description: z.string(),
  images: z.array(z.object({
    file_id: z.string().uuid(),
    url: z.string().url().refine(value => /^https?:\/\//i.test(value)),
  })).max(3),
  resolution: resolutionSchema.nullable(),
});
export function mapClaimDetail(dto: ApiClaimDetail): ClaimDetail {
  const value = detailSchema.parse(dto);
  const resolution = value.resolution;
  const compensation = resolution?.suggested_compensation;
  return {
    ...mapClaimAcknowledgment(value),
    reason: value.reason,
    reviewStartedOn: value.review_started_on,
    closedOn: value.closed_on,
    description: value.description,
    images: value.images.map(image => ({ fileId: image.file_id, url: image.url })),
    resolution: resolution ? {
      type: resolution.type,
      reasoning: resolution.reasoning,
      resolvedOn: resolution.resolved_on,
      suggestedCompensation: compensation ? {
        amountMinor: compensation.amount_minor,
        currency: compensation.currency,
        unit: compensation.unit,
      } : null,
    } : null,
  };
}
