import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderCollectionTransactions } from "@/application/provider/get-provider-collection-transactions";
import { getProviderCollectionTransactionsAction } from "./transaction-actions";
import { t } from "@/infrastructure/i18n/translations";

vi.mock("@/infrastructure/auth", () => ({ getAuthService: vi.fn() }));
vi.mock("@/application/provider/get-provider-collection-transactions", () => ({ getProviderCollectionTransactions: vi.fn() }));
vi.mock("@/infrastructure/repositories/provider/api-provider-collection-repository", () => ({ ApiProviderCollectionRepository: class {} }));

describe("collections action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthService).mockReturnValue({ getSession: vi.fn().mockResolvedValue({ user: { role: "provider" } }), updateSession: vi.fn() });
  });
  it("does not expose technical errors", async () => {
    vi.mocked(getProviderCollectionTransactions).mockRejectedValue(new Error("secret backend detail"));
    expect(await getProviderCollectionTransactionsAction({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00" })).toEqual({ success: false, error: t.providerCollections.detailError });
  });
  it("rejects consumers before loading private collections", async () => {
    vi.mocked(getAuthService).mockReturnValue({ getSession: vi.fn().mockResolvedValue({ user: { role: "consumer" } }), updateSession: vi.fn() });
    expect(await getProviderCollectionTransactionsAction({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00" })).toEqual({ success: false, error: t.providerCollections.unauthorized });
    expect(getProviderCollectionTransactions).not.toHaveBeenCalled();
  });
});
