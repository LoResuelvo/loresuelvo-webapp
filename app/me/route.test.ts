import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthService: vi.fn(),
  getCurrentUserAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/infrastructure/auth", () => ({ getAuthService: mocks.getAuthService }));
vi.mock("@/app/api/me/actions", () => ({ getCurrentUserAction: mocks.getCurrentUserAction }));

function requestWithResult(result?: string): NextRequest {
  const query = result === undefined ? "" : `?calendar_result=${encodeURIComponent(result)}`;
  return new NextRequest(`http://localhost:3000/me${query}`);
}

function makeRedirectError(destination: unknown): Error {
  return new Error(`redirect:${String(destination)}`);
}

describe("GET /me calendar callback bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((destination: unknown) => {
      throw makeRedirectError(destination);
    });
    mocks.getAuthService.mockReturnValue({
      getSession: vi.fn().mockResolvedValue({
        user: { id: "consumer-001", email: "ana@example.com", role: "consumer" },
        accessToken: "opaque-token",
      }),
    });
  });

  it("redirects an authenticated consumer with only the allowed success result", async () => {
    await expect(GET(requestWithResult("success"))).rejects.toThrow(
      "redirect:/consumidor/mi-perfil?calendar_result=success",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/consumidor/mi-perfil?calendar_result=success");
    expect(mocks.getCurrentUserAction).not.toHaveBeenCalled();
  });

  it("redirects an authenticated provider with only the allowed cancelled result", async () => {
    mocks.getAuthService.mockReturnValue({
      getSession: vi.fn().mockResolvedValue({
        user: { id: "provider-001", email: "juan@example.com", role: "provider" },
        accessToken: "opaque-token",
      }),
    });

    await expect(GET(requestWithResult("cancelled"))).rejects.toThrow(
      "redirect:/prestador/mi-perfil?calendar_result=cancelled",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/prestador/mi-perfil?calendar_result=cancelled");
  });

  it.each([undefined, "failed", "success&calendar_result=cancelled"])(
    "fails closed for an invalid callback result: %s",
    async (result) => {
      await expect(GET(requestWithResult(result))).rejects.toThrow("redirect:/");

      expect(mocks.getAuthService).not.toHaveBeenCalled();
      expect(mocks.getCurrentUserAction).not.toHaveBeenCalled();
    },
  );

  it("falls back to the authoritative current user when the session has no role", async () => {
    mocks.getAuthService.mockReturnValue({
      getSession: vi.fn().mockResolvedValue({
        user: { id: "provider-001", email: "juan@example.com" },
        accessToken: "opaque-token",
      }),
    });
    mocks.getCurrentUserAction.mockResolvedValue({ role: "provider" });

    await expect(GET(requestWithResult("success"))).rejects.toThrow(
      "redirect:/prestador/mi-perfil?calendar_result=success",
    );
    expect(mocks.getCurrentUserAction).toHaveBeenCalledOnce();
  });

  it("fails closed when the fallback current user does not expose a supported role", async () => {
    mocks.getAuthService.mockReturnValue({
      getSession: vi.fn().mockResolvedValue({
        user: { id: "unknown-001", email: "unknown@example.com" },
        accessToken: "opaque-token",
      }),
    });
    mocks.getCurrentUserAction.mockResolvedValue({ role: "unknown" });

    await expect(GET(requestWithResult("success"))).rejects.toThrow("redirect:/");
    expect(mocks.getCurrentUserAction).toHaveBeenCalledOnce();
  });
});
