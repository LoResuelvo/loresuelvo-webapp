import { describe, expect, it, vi } from "vitest";
import { getClaimDetail } from "./get-claim-detail";

describe("Get private claim detail", () => {
  it("rejects invalid identifiers before accessing private data", async () => {
    const repository = {getById:vi.fn()};
    for (const id of [0, -1, 1.5, 2147483648, NaN]) {
      await expect(getClaimDetail(repository,id)).rejects.toThrow();
    }
    expect(repository.getById).not.toHaveBeenCalled();
  });
});
