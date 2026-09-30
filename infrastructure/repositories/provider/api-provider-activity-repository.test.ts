import { describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { ApiProviderActivityRepository, activityEndpoint } from "./api-provider-activity-repository";
import { anActivityResponse } from "@/features/support/activity-factory";

vi.mock("@/infrastructure/api/base-client", () => ({ api: { get: vi.fn() } }));

describe("activity repository", () => {
  it("queries the authenticated actor endpoint and maps results", async () => {
    vi.mocked(api.get).mockResolvedValue(anActivityResponse());
    const activity = await new ApiProviderActivityRepository().getActivity({});
    expect(api.get).toHaveBeenCalledWith("/providers/me/statistics/activity");
    expect(activity.results.clientsServed).toBe(3);
  });
  it("encodes offsets without unrelated parameters", () => {
    const endpoint = activityEndpoint({ from: "2026-08-01T00:00:00+03:00", to: "2026-08-02T00:00:00+03:00", granularity: "week" });
    const params = new URLSearchParams(endpoint.split("?")[1]);
    expect(params.get("from")).toBe("2026-08-01T00:00:00+03:00");
    expect([...params.keys()]).toEqual(["from", "to", "granularity"]);
  });
});
