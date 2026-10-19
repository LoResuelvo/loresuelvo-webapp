import type { ClaimReference, ClaimSubmission } from "./types";

export const CLAIM_MAX_IMAGES = 3;
export const CLAIM_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isClaimUuid(value: string): boolean {
  return UUID.test(value) && value !== "00000000-0000-0000-0000-000000000000";
}
function trimTestimony(value: string): string {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
}
export function validateClaimDescription(value: string): boolean {
  const normalized = trimTestimony(value);
  const length = Array.from(normalized).length;
  return length >= 1 && length <= 5000 && !/[\u0000\uD800-\uDFFF]/u.test(normalized);
}
export function validateClaimImage(file: { readonly type: string; readonly size: number }): boolean {
  return ["image/jpeg", "image/png"].includes(file.type) && file.size > 0 && file.size <= CLAIM_MAX_IMAGE_BYTES;
}
export function isClaimReference(value: ClaimReference): boolean {
  if (!value) return false;
  if (value.kind === "payment_intent") return typeof value.id === "string" && isClaimUuid(value.id);
  return ["job_request", "service_proposal", "work_order"].includes(value.kind) &&
    Number.isInteger(value.id) && value.id > 0 && value.id <= 2147483647;
}
export function normalizeClaimSubmission(input: ClaimSubmission): ClaimSubmission {
  if (!input || !isClaimReference(input.reference) ||
      !["non_compliance", "improper_charge", "damage", "poor_quality"].includes(input.reason) ||
      typeof input.description !== "string" || !validateClaimDescription(input.description) ||
      !Array.isArray(input.imageFileIds) || input.imageFileIds.length > CLAIM_MAX_IMAGES ||
      input.imageFileIds.some(id => typeof id !== "string" || !isClaimUuid(id))) {
    throw new Error("Invalid claim submission");
  }
  const imageFileIds = input.imageFileIds.map(id => id.toLowerCase()).sort();
  if (new Set(imageFileIds).size !== imageFileIds.length) throw new Error("Repeated claim evidence");
  return { reference: input.reference, reason: input.reason, description: trimTestimony(input.description), imageFileIds };
}
