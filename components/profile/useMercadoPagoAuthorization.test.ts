import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMercadoPagoAuthorization } from "./useMercadoPagoAuthorization";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe("useMercadoPagoAuthorization", () => {
  it("keeps the action busy after navigation starts and ignores duplicate requests", async () => {
    const request = deferred<{ authorizationUrl: string }>();
    const startAuthorizationAction = vi.fn(() => request.promise);
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      useMercadoPagoAuthorization({ startAuthorizationAction, navigate }),
    );

    let firstRequest: Promise<boolean> | undefined;
    await act(async () => {
      firstRequest = result.current.startAuthorization();
    });

    expect(result.current.isAuthorizing).toBe(true);
    expect(startAuthorizationAction).toHaveBeenCalledOnce();

    await act(async () => {
      await result.current.startAuthorization();
    });

    expect(startAuthorizationAction).toHaveBeenCalledOnce();

    request.resolve({ authorizationUrl: "https://auth.mercadopago.com/authorization" });
    await act(async () => {
      await firstRequest;
    });

    expect(navigate).toHaveBeenCalledWith("https://auth.mercadopago.com/authorization");
    expect(result.current.isAuthorizing).toBe(true);

    await act(async () => {
      await result.current.startAuthorization();
    });

    expect(startAuthorizationAction).toHaveBeenCalledOnce();
  });

  it("returns to idle with a safe error when authorization fails", async () => {
    const startAuthorizationAction = vi.fn().mockRejectedValue(new Error("private API detail"));
    const { result } = renderHook(() =>
      useMercadoPagoAuthorization({ startAuthorizationAction }),
    );

    await act(async () => {
      await result.current.startAuthorization();
    });

    expect(result.current.isAuthorizing).toBe(false);
    expect(result.current.error).toBe(
      "No pudimos iniciar la vinculación con Mercado Pago. Intentá nuevamente.",
    );
    expect(result.current.error).not.toContain("private API detail");
  });

  it("ignores the authorization response after the hook unmounts", async () => {
    const request = deferred<{ authorizationUrl: string }>();
    const startAuthorizationAction = vi.fn(() => request.promise);
    const navigate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMercadoPagoAuthorization({ startAuthorizationAction, navigate }),
    );

    let authorization: Promise<boolean> | undefined;
    await act(async () => {
      authorization = result.current.startAuthorization();
    });
    unmount();

    request.resolve({ authorizationUrl: "https://auth.mercadopago.com/authorization" });
    await act(async () => {
      await authorization;
    });

    expect(navigate).not.toHaveBeenCalled();
  });
});
