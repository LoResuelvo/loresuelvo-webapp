import { describe, expect, it, vi } from "vitest";
import { getProviderActivity } from "./get-provider-activity";
import { mapProviderActivity } from "@/infrastructure/repositories/provider/activity-mapper";
import { anActivityResponse } from "@/features/support/activity-factory";

describe("getProviderActivity", () => {
  it("preserves server results instead of deriving statistics", async () => {
    const model = mapProviderActivity(anActivityResponse());
    const repository = { getActivity: vi.fn().mockResolvedValue(model) };
    expect(await getProviderActivity(repository)).toBe(model);
    expect(repository.getActivity).toHaveBeenCalledWith({});
  });
  it("propagates repository failures", async () => {
    const failure = new Error("unavailable");
    await expect(getProviderActivity({ getActivity: vi.fn().mockRejectedValue(failure) })).rejects.toBe(failure);
  });
  it("rejects invalid ranges before consulting the repository", async () => {
    const repository = { getActivity: vi.fn() };
    await expect(getProviderActivity(repository, { from: "2026-08-01T00:00:00-03:00" })).rejects.toThrow();
    expect(repository.getActivity).not.toHaveBeenCalled();
  });
});
