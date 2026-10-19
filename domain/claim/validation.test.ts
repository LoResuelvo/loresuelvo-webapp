import { describe, expect, it } from "vitest";
import { normalizeClaimSubmission, validateClaimDescription, validateClaimImage } from "./validation";
import type { ClaimSubmission } from "./types";
const input: ClaimSubmission = { reference: {kind: "job_request", id: 47}, reason: "damage", description: " Testimony ", imageFileIds: [] };
describe("Claim submission invariants", () => {
  it("normalizes Unicode whitespace and counts code points rather than UTF-16 units", () => {
    expect(normalizeClaimSubmission({...input,description: "\u0085" + "😀".repeat(5000) + "\u0085"}).description).toHaveLength(10000);
    expect(validateClaimDescription("😀".repeat(5001))).toBe(false);
    expect(validateClaimDescription("\uFEFF")).toBe(true);
  });
  it("rejects missing testimony, NUL and malformed Unicode", () => {
    for (const value of ["", " \u0085 ", "text\0", "\ud800"]) expect(validateClaimDescription(value)).toBe(false);
  });
  it("accepts only nonempty JPEG and PNG images up to 5 MiB", () => {
    expect(validateClaimImage({type:"image/png",size:5242880})).toBe(true);
    for (const file of [{type:"image/webp",size:10},{type:"image/jpeg",size:0},{type:"image/png",size:5242881}]) expect(validateClaimImage(file)).toBe(false);
  });
  it("rejects invalid references and repeated or excessive evidence IDs", () => {
    expect(() => normalizeClaimSubmission({...input,reference:{kind:"job_request",id:0}})).toThrow();
    const id="550e8400-e29b-41d4-a716-446655440031";
    expect(() => normalizeClaimSubmission({...input,imageFileIds:[id,id]})).toThrow();
    expect(() => normalizeClaimSubmission({...input,imageFileIds:["not-a-uuid"]})).toThrow();
  });
});
