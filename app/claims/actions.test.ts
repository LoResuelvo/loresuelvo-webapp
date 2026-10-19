import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, api } from "@/infrastructure/api/base-client";
import { createClaimAction, listClaimReferencesAction, listClaimsAction, getClaimDetailAction } from "./actions";
import type { ClaimSubmission } from "@/domain/claim/types";
const {getSession}=vi.hoisted(() => ({getSession:vi.fn()}));
vi.mock("@/infrastructure/auth", () => ({getAuthService:()=>({getSession})}));
vi.mock("@/infrastructure/api/base-client", async importOriginal => {
  const actual = await importOriginal<typeof import("@/infrastructure/api/base-client")>();
  return {...actual,api:{get:vi.fn(),post:vi.fn()}};
});
vi.mock("@/infrastructure/i18n/translations", () => ({t:{claims:{requestReference:"Solicitud",proposalReference:"Propuesta"}}}));
const input: ClaimSubmission={reference:{kind:"job_request",id:47},reason:"non_compliance",description:" Testimony ",imageFileIds:[]};
const key="550e8400-e29b-41d4-a716-446655440000";
describe("Claim Server Actions", () => {
  beforeEach(() => {vi.clearAllMocks();getSession.mockResolvedValue({user:{role:"consumer"}});});
  it("requires a session before querying or creating private claims", async () => {
    getSession.mockResolvedValue(null);
    expect(await createClaimAction(input,key)).toMatchObject({ok:false,status:401,error:"unauthenticated"});
    expect(await listClaimReferencesAction()).toMatchObject({ok:false,status:401});
    expect(await listClaimsAction()).toMatchObject({ok:false,status:401});
    expect(await getClaimDetailAction(9)).toMatchObject({ok:false,status:401});
    expect(api.post).not.toHaveBeenCalled(); expect(api.get).not.toHaveBeenCalled();
  });
  it("supports an authenticated provider and filters private claims through the API", async () => {
    getSession.mockResolvedValue({user:{role:"provider"}});
    vi.mocked(api.get).mockResolvedValue({items:[],page:2,limit:20,total:0});
    expect(await listClaimsAction({page:2,status:"dismissed"})).toEqual({ok:true,data:{items:[],page:2,limit:20,total:0}});
    expect(api.get).toHaveBeenCalledWith("/claims?page=2&limit=20&status=dismissed");
  });
  it("does not query invalid list criteria", async () => {
    expect(await listClaimsAction({limit:101})).toMatchObject({ok:false,status:400,error:"invalid"});
    expect(api.get).not.toHaveBeenCalled();
  });
  it("does not send invalid testimony to the API", async () => {
    expect(await createClaimAction({...input,description:" "},key)).toMatchObject({ok:false,status:400,error:"invalid"});
    expect(api.post).not.toHaveBeenCalled();
  });
  it("validates contextual order identifiers before making requests", async () => {
    expect(await listClaimReferencesAction(-1)).toMatchObject({ok:false,status:400,error:"invalid"});
    expect(api.get).not.toHaveBeenCalled();
  });
  it("does not expose a missing or foreign contextual order", async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === "/work-orders/42") throw new ApiClientError(404,"error","private operation");
      return [];
    });
    expect(await listClaimReferencesAction(42)).toEqual({ok:false,status:404,error:"not_found"});
    expect(api.get).toHaveBeenCalledWith("/work-orders/42");
  });
  it("normalizes testimony and returns a successful acknowledgment", async () => {
    vi.mocked(api.post).mockResolvedValue({id:7,operation_id:"jr-47",reference:{job_request_id:47},status:"open",created_on:"2026-10-19T12:00:00Z"});
    expect(await createClaimAction(input,key)).toMatchObject({ok:true,data:{id:7,status:"open"}});
    expect(api.post).toHaveBeenCalledWith("/claims",expect.objectContaining({description:"Testimony"}),{"Idempotency-Key":key});
  });
  it.each([
    [403,"claimant account is not enabled","forbidden"],
    [404,"claim resource not found","not_found"],
    [409,"an unfinished claim already exists for this operation","unfinished_claim"],
    [409,"claim submission key already used with different content","key_conflict"],
    [500,"private backend diagnostic","unavailable"],
  ])("maps status %s to a safe client error", async (status,message,error) => {
    vi.mocked(api.post).mockRejectedValue(new ApiClientError(status,"error",message));
    expect(await createClaimAction(input,key)).toEqual({ok:false,status,error});
  });
  it("validates the detail identifier before querying", async () => {
    expect(await getClaimDetailAction(0)).toEqual({ok:false,status:400,error:"invalid"});
    expect(api.get).not.toHaveBeenCalled();
  });
  it.each([401,403,404,500])("does not expose private detail after status %s", async status => {
    vi.mocked(api.get).mockRejectedValue(new ApiClientError(status,"error","Private testimony and storage URL"));
    const result = await getClaimDetailAction(9);
    expect(result).toEqual({ok:false,status,error:status===401 ? "unauthenticated" : status===403 ? "forbidden" : status===404 ? "not_found" : "unavailable"});
    expect(JSON.stringify(result)).not.toContain("Private testimony");
  });

});
