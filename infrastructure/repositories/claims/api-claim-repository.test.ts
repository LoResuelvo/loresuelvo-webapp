import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import type { ApiClaimAcknowledgment } from "@/infrastructure/api/types";
import { ApiClaimRepository } from "./api-claim-repository";
import { mapClaimAcknowledgment } from "./claim-mapper";
vi.mock("@/infrastructure/api/base-client", () => ({api:{post:vi.fn()}}));
const acknowledgment: ApiClaimAcknowledgment = {id:7,operation_id:"jr-47",reference:{job_request_id:47},status:"open",created_on:"2026-10-19T12:00:00Z"};
describe("Claim API boundary", () => {
  beforeEach(() => vi.clearAllMocks());
  it("submits stable evidence IDs with the caller's idempotency key", async () => {
    vi.mocked(api.post).mockResolvedValue(acknowledgment);
    const ids=["550e8400-e29b-41d4-a716-446655440031"];
    const result=await new ApiClaimRepository().submit({reference:{kind:"job_request",id:47},reason:"damage",description:"Testimony",imageFileIds:ids},"550e8400-e29b-41d4-a716-446655440000");
    expect(api.post).toHaveBeenCalledWith("/claims",{reference:{job_request_id:47},reason:"damage",description:"Testimony",image_file_ids:ids},{"Idempotency-Key":"550e8400-e29b-41d4-a716-446655440000"});
    expect(result).toMatchObject({id:7,operationId:"jr-47",reference:{kind:"job_request",id:47}});
  });
  it("rejects malformed acknowledgments and excludes nonpublic fields", () => {
    expect(() => mapClaimAcknowledgment({...acknowledgment,id:0})).toThrow();
    const external={...acknowledgment,operator_id:99};
    expect(mapClaimAcknowledgment(external)).not.toHaveProperty("operator_id");
  });
});
