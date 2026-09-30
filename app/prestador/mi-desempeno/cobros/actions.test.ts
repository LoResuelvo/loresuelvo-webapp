import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderCollections } from "@/application/provider/get-provider-collections";
import { getProviderCollectionsAction } from "./actions";
import { t } from "@/infrastructure/i18n/translations";

vi.mock("@/infrastructure/auth", () => ({ getAuthService: vi.fn() }));
vi.mock("@/application/provider/get-provider-collections", () => ({ getProviderCollections: vi.fn() }));
vi.mock("@/infrastructure/repositories/provider/api-provider-collection-repository", () => ({ ApiProviderCollectionRepository: class {} }));

describe("collections action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthService).mockReturnValue({ getSession: vi.fn().mockResolvedValue({ user: { role: "provider" } }), updateSession: vi.fn() });
  });
  it("does not expose technical errors", async () => {
    vi.mocked(getProviderCollections).mockRejectedValue(new Error("secret backend detail"));
    expect(await getProviderCollectionsAction()).toEqual({ success: false, error: t.providerCollections.error });
  });
  it("rejects consumers before loading private collections", async () => {
    vi.mocked(getAuthService).mockReturnValue({ getSession: vi.fn().mockResolvedValue({ user: { role: "consumer" } }), updateSession: vi.fn() });
    expect(await getProviderCollectionsAction()).toEqual({ success: false, error: t.providerCollections.unauthorized });
    expect(getProviderCollections).not.toHaveBeenCalled();
  });
});
