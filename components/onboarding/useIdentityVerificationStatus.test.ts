import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useIdentityVerificationStatus } from "./useIdentityVerificationStatus";

describe("useIdentityVerificationStatus", () => {
  it("loads an initial status and exposes a manual refresh command", async () => {
    const readStatus = vi
      .fn()
      .mockResolvedValueOnce({
        success: true as const,
        data: { status: "in_review" as const },
      })
      .mockResolvedValueOnce({
        success: true as const,
        data: { status: "approved" as const },
      });
    const { result } = renderHook(() =>
      useIdentityVerificationStatus({ readStatus, initialStatus: "in_review" }),
    );

    await waitFor(() => expect(result.current.status).toBe("in_review"));
    await act(async () => {
      result.current.refresh();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("approved"));
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it("does not read while disabled and starts when enabled", async () => {
    const readStatus = vi.fn().mockResolvedValue({
      success: true as const,
      data: { status: "approved" as const },
    });
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useIdentityVerificationStatus({
          readStatus,
          initialStatus: "in_review",
          enabled,
        }),
      { initialProps: { enabled: false } },
    );

    expect(result.current.status).toBe("in_review");
    expect(result.current.isLoading).toBe(false);
    expect(readStatus).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.status).toBe("approved"));
    expect(readStatus).toHaveBeenCalledOnce();
  });
});
