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
    vi.useRealTimers();
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
  it("reports timeout diagnostics without exposing request or abort details", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const privateToken = "private-access-token";
    const privateId = "550e8400-e29b-41d4-a716-446655440000";
    fetchMock.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException(`Aborted ${privateToken}`, "AbortError"));
      }, { once: true });
    }));

    const request = new ApiClient().get(`/claims/${privateId}?access_token=${privateToken}`);
    const errorPromise = request.catch((reason: unknown) => reason);
    await vi.advanceTimersByTimeAsync(30000);
    const error = await errorPromise;

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 504, statusText: "Gateway Timeout" });

    const diagnostic = log.mock.calls
      .map(([, context]) => context)
      .find((context) => typeof context === "object" && context !== null && "kind" in context && context.kind === "timeout");
    expect(diagnostic).toMatchObject({ kind: "timeout", method: "GET", causeName: "AbortError" });
    expect(diagnostic?.durationMs).toBeGreaterThanOrEqual(30000);
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateToken);
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateId);
  });

  it("reports network diagnostics and safe cause metadata without logging the cause message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const privateToken = "private-network-token";
    const privateId = "550e8400-e29b-41d4-a716-446655440000";
    const privateCauseMessage = `Private fetch cause ${privateToken}`;
    const networkError = Object.assign(
      new TypeError(`Failed to fetch https://api.example.test/claims/${privateId}?access_token=${privateToken}`),
      { cause: Object.assign(new Error(privateCauseMessage), { code: "ECONNRESET" }) },
    );
    fetchMock.mockRejectedValue(networkError);

    const error = await new ApiClient()
      .get(`/claims/${privateId}?access_token=${privateToken}`)
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 504, statusText: "Gateway Timeout" });

    const diagnostic = log.mock.calls
      .map(([, context]) => context)
      .find((context) => typeof context === "object" && context !== null && "kind" in context && context.kind === "network");
    expect(diagnostic).toMatchObject({
      kind: "network",
      method: "GET",
      causeName: "TypeError",
      causeCode: "ECONNRESET",
    });
    expect(typeof diagnostic?.durationMs).toBe("number");
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateToken);
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateId);
    expect(JSON.stringify(log.mock.calls)).not.toContain(networkError.message);
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateCauseMessage);
  });

  it("omits unrecognized cause metadata that may contain private data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const privateValue = "private-token";
    fetchMock.mockRejectedValue({ name: privateValue, code: privateValue });

    await expect(new ApiClient().get("/claims")).rejects.toBeInstanceOf(ApiClientError);

    expect(log).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      kind: "network", causeName: "UnknownError",
    }));
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateValue);
  });
});
