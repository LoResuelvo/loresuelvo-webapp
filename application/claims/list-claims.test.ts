import { describe, expect, it } from "vitest";
import { isClaimListCriteria } from "./list-claims";

describe("Claim list criteria", () => {
  it("accepts optional status and API pagination bounds", () => {
    expect(isClaimListCriteria({})).toBe(true);
    expect(isClaimListCriteria({status:"resolved",page:1,limit:100})).toBe(true);
  });
  it("rejects invalid pagination without querying private data", () => {
    expect(isClaimListCriteria({page:0})).toBe(false);
    expect(isClaimListCriteria({page:1.5})).toBe(false);
    expect(isClaimListCriteria({limit:101})).toBe(false);
  });
});
