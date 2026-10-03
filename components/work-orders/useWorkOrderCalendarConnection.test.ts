import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserAction } from "@/app/api/me/actions";
import type { CurrentUser } from "@/domain/user/types";
import { useWorkOrderCalendarConnection } from "./useWorkOrderCalendarConnection";

vi.mock("@/app/api/me/actions", () => ({ getCurrentUserAction: vi.fn() }));

const currentUser: CurrentUser = {
  id: 10,
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  role: "consumer",
  calendarConnectionStatus: "connected",
};

describe("useWorkOrderCalendarConnection", () => {
  beforeEach(() => vi.resetAllMocks());

  it("keeps the account unresolved until its independent request completes", async () => {
    let resolveUser!: (user: CurrentUser) => void;
    vi.mocked(getCurrentUserAction).mockReturnValue(new Promise((resolve) => {
      resolveUser = resolve;
    }));
    const { result, rerender } = renderHook(() => useWorkOrderCalendarConnection());

    expect(result.current).toEqual({ state: "loading" });
    rerender();
    expect(getCurrentUserAction).toHaveBeenCalledTimes(1);
    await act(async () => resolveUser(currentUser));

    expect(result.current).toEqual({ state: "ready", status: "connected" });
  });

  it("preserves a failed account lookup without inventing a disconnected status", async () => {
    vi.mocked(getCurrentUserAction).mockRejectedValue(new Error("Private upstream failure"));
    const { result } = renderHook(() => useWorkOrderCalendarConnection());

    await waitFor(() => expect(result.current).toEqual({ state: "error" }));
  });

  it("discards a late account response after the surface unmounts", async () => {
    let resolveUser!: (user: CurrentUser) => void;
    vi.mocked(getCurrentUserAction).mockReturnValue(new Promise((resolve) => {
      resolveUser = resolve;
    }));
    const { result, unmount } = renderHook(() => useWorkOrderCalendarConnection());
    unmount();
    await act(async () => resolveUser(currentUser));

    expect(result.current).toEqual({ state: "loading" });
  });
});
