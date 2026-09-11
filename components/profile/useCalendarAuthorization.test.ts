import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCalendarAuthorization } from "./useCalendarAuthorization";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe("useCalendarAuthorization", () => {
  it("prevents a second authorization while the first request is pending", async () => {
    const request = deferred<{
      ok: true;
      authorizationUrl: string;
    }>();
    const startAuthorizationAction = vi.fn().mockReturnValue(request.promise);
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      useCalendarAuthorization({ startAuthorizationAction, navigate }),
    );

    let firstRequest: Promise<void> | undefined;
    await act(async () => {
      firstRequest = result.current.startAuthorization();
    });

    expect(result.current.isAuthorizing).toBe(true);
    expect(startAuthorizationAction).toHaveBeenCalledOnce();

    await act(async () => {
      await result.current.startAuthorization();
    });

    expect(startAuthorizationAction).toHaveBeenCalledOnce();

    request.resolve({
      ok: true,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    });
    await act(async () => {
      await firstRequest;
    });

    expect(navigate).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth");
    expect(result.current.isAuthorizing).toBe(false);
  });

  it("returns to idle with a safe error when authorization fails", async () => {
    const startAuthorizationAction = vi.fn().mockResolvedValue({
      ok: false,
      error: "No pudimos iniciar la vinculación con Google Calendar. Intentá nuevamente.",
    });
    const { result } = renderHook(() => useCalendarAuthorization({ startAuthorizationAction }));

    await act(async () => {
      await result.current.startAuthorization();
    });

    expect(result.current.isAuthorizing).toBe(false);
    expect(result.current.error).toBe(
      "No pudimos iniciar la vinculación con Google Calendar. Intentá nuevamente.",
    );
  });

  it("rejects unsafe authorization URLs without navigating", async () => {
    const startAuthorizationAction = vi.fn().mockResolvedValue({
      ok: true,
      authorizationUrl: "javascript:alert('unsafe')",
    });
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      useCalendarAuthorization({ startAuthorizationAction, navigate }),
    );

    await act(async () => {
      await result.current.startAuthorization();
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "No pudimos iniciar la vinculación con Google Calendar. Intentá nuevamente.",
    );
  });
});
