import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderActivity } from "@/application/provider/get-provider-activity";
import { getProviderActivityAction } from "./actions";
import { t } from "@/infrastructure/i18n/translations";

vi.mock("@/infrastructure/auth", () => ({ getAuthService: vi.fn() }));
vi.mock("@/application/provider/get-provider-activity", () => ({ getProviderActivity: vi.fn() }));
vi.mock("@/infrastructure/repositories/provider/api-provider-activity-repository", () => ({ ApiProviderActivityRepository: class {} }));

describe("activity action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthService).mockReturnValue({ getSession: vi.fn().mockResolvedValue({ user: { role: "provider" } }), updateSession: vi.fn() });
  });
  it("does not expose technical errors", async () => {
    vi.mocked(getProviderActivity).mockRejectedValue(new Error("secret backend detail"));
    expect(await getProviderActivityAction()).toEqual({ success: false, error: t.providerActivity.error });
  });
  it("rejects consumers before loading private activity", async () => {
    vi.mocked(getAuthService).mockReturnValue({ getSession: vi.fn().mockResolvedValue({ user: { role: "consumer" } }), updateSession: vi.fn() });
    expect(await getProviderActivityAction()).toEqual({ success: false, error: t.providerActivity.unauthorized });
    expect(getProviderActivity).not.toHaveBeenCalled();
  });
});
