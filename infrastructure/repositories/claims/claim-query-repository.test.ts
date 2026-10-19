import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { ApiClaimRepository } from "./api-claim-repository";

vi.mock("@/infrastructure/api/base-client", () => ({api:{get:vi.fn()}}));

const summary = {
  id: 9, operation_id: "jr-47", reference: {job_request_id:47},
  status: "in_review", reason: "damage", created_on:"2026-10-19T12:00:00Z",
  review_started_on:"2026-10-19T13:00:00Z", closed_on:null,
};

describe("Claim query repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves the private page order and maps only public summary fields", async () => {
    vi.mocked(api.get).mockResolvedValue({items:[{...summary,description:"Private testimony",images:[{url:"private-url"}]}],page:2,limit:20,total:25});
    const result = await new ApiClaimRepository().list({status:"in_review",page:2});
    expect(api.get).toHaveBeenCalledWith("/claims?page=2&limit=20&status=in_review");
    expect(result).toEqual({items:[{
      id:9,operationId:"jr-47",reference:{kind:"job_request",id:47},status:"in_review",reason:"damage",
      createdOn:"2026-10-19T12:00:00Z",reviewStartedOn:"2026-10-19T13:00:00Z",closedOn:null,
    }],page:2,limit:20,total:25});
  });

  it("rejects malformed page data instead of reporting an empty list", async () => {
    vi.mocked(api.get).mockResolvedValue({items:[],page:1,limit:20});
    await expect(new ApiClaimRepository().list({})).rejects.toThrow();
  });
  it("maps owned detail and nullable resolution without leaking extra fields", async () => {
    vi.mocked(api.get).mockResolvedValue({...summary,description:"Original testimony",images:[],resolution:null,claimant_id:999});
    const result = await new ApiClaimRepository().getById(9);
    expect(api.get).toHaveBeenCalledWith("/claims/9");
    expect(result.description).toBe("Original testimony");
    expect(result.resolution).toBeNull();
    expect(result).not.toHaveProperty("claimant_id");
  });

  it("maps a formal resolution and suggested compensation as integer ARS cents", async () => {
    vi.mocked(api.get).mockResolvedValue({...summary,description:"Original testimony",images:[],resolution:{
      type:"consumer_favor",reasoning:"Verified non-compliance",resolved_on:"2026-10-19T14:00:00Z",
      suggested_compensation:{amount_minor:1500,currency:"ARS",unit:"minor"},
    }});
    const result = await new ApiClaimRepository().getById(9);
    expect(result.resolution).toEqual({type:"consumer_favor",reasoning:"Verified non-compliance",resolvedOn:"2026-10-19T14:00:00Z",
      suggestedCompensation:{amountMinor:1500,currency:"ARS",unit:"minor"}});
  });

  it("maps only temporary URLs returned inside the owned detail", async () => {
    const fileId="550e8400-e29b-41d4-a716-446655440031";
    vi.mocked(api.get).mockResolvedValue({...summary,description:"Original testimony",images:[{file_id:fileId,url:"https://private.example/image?signature=temporary"}],resolution:null});
    expect((await new ApiClaimRepository().getById(9)).images).toEqual([{fileId,url:"https://private.example/image?signature=temporary"}]);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
  it("does not return partial detail when evidence signing fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Evidence signing unavailable"));
    await expect(new ApiClaimRepository().getById(9)).rejects.toThrow("Evidence signing unavailable");
  });

});
