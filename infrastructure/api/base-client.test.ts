import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiClientError } from "./base-client";

vi.mock("@/infrastructure/auth", () => ({
  getAuthService: () => ({ getSession: async () => ({ accessToken: "test-token" }) }),
}));
vi.mock("@/infrastructure/config/runtime-env", () => ({ usesE2EAdapters: () => false }));
vi.mock("@/infrastructure/config/server-env", () => ({ getApiUrl: () => "https://api.example.test" }));

describe("ApiClient private claim requests", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("sends the submission key alongside authentication without caching", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 7 }), { status: 201 }));
    const key = "550e8400-e29b-41d4-a716-446655440000";
    await new ApiClient().post("/claims", { description: "Private testimony" }, { "Idempotency-Key": key });
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/claims", expect.objectContaining({
      method: "POST",
      cache: "no-store",
      headers: expect.objectContaining({ Authorization: "Bearer test-token", "Idempotency-Key": key }),
    }));
  });

  it("keeps private error contents out of logs while preserving the typed error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const privateBody = { error: "private testimony and signed evidence URL" };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(privateBody), { status: 500 }));
    await expect(new ApiClient().get("/claims/7")).rejects.toMatchObject({
      name: "ApiClientError", status: 500, body: privateBody,
    } satisfies Partial<ApiClientError>);
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateBody.error);
  });
});
