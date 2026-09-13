import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { startIdentityVerificationAction } from "@/app/onboarding/identity-actions";
import { useIdentityVerification } from "./useIdentityVerification";

const mockPush = vi.fn();

vi.mock("@/app/onboarding/identity-actions", () => ({
  startIdentityVerificationAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("useIdentityVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes a double click while starting a verification", async () => {
    let resolveAction: ((value: {
      success: true;
      data: { kind: "started"; verificationUrl: string };
    }) => void) | undefined;
    vi.mocked(startIdentityVerificationAction).mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    const { result } = renderHook(() => useIdentityVerification());
    let firstStart = Promise.resolve();
    let secondStart = Promise.resolve();

    act(() => {
      firstStart = result.current.start();
      secondStart = result.current.start();
    });
    await waitFor(() => {
      expect(result.current.isStarting).toBe(true);
    });

    await act(async () => {
      resolveAction?.({
        success: true,
        data: {
          kind: "started",
          verificationUrl: "https://verify.example/session-1",
        },
      });
      await Promise.all([firstStart, secondStart]);
    });

    expect(startIdentityVerificationAction).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("https://verify.example/session-1");
    expect(result.current.isStarting).toBe(false);
  });

  it("updates to approved only when the use case confirms it", async () => {
    vi.mocked(startIdentityVerificationAction).mockResolvedValue({
      success: true,
      data: { kind: "already_verified" },
    });

    const { result } = renderHook(() => useIdentityVerification());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("approved");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("exposes a safe action error without navigating", async () => {
    vi.mocked(startIdentityVerificationAction).mockResolvedValue({
      success: false,
      code: "temporary",
      error: "No pudimos iniciar la verificación en este momento.",
    });

    const { result } = renderHook(() => useIdentityVerification());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("No pudimos iniciar la verificación en este momento.");
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.isStarting).toBe(false);
  });
});
