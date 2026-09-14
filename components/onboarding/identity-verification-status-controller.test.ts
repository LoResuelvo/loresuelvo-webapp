import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIdentityVerificationStatusController,
  IDENTITY_STATUS_POLL_INTERVAL_MS,
  IDENTITY_STATUS_POLL_TIMEOUT_MS,
  type IdentityVerificationStatusControllerState,
} from "./identity-verification-status-controller";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function aState(status: IdentityVerificationStatusControllerState["status"] = null) {
  return { status, isLoading: false, isRefreshing: false, timedOut: false, error: null };
}

describe("identity verification status controller", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the status immediately and stops after an approved result", async () => {
    vi.useFakeTimers();
    const states: IdentityVerificationStatusControllerState[] = [];
    const readStatus = vi.fn().mockResolvedValue({
      success: true as const,
      data: { status: "approved" as const },
    });
    const controller = createIdentityVerificationStatusController({
      readStatus,
      onStateChange: (state) => states.push(state),
      pollPending: true,
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(IDENTITY_STATUS_POLL_INTERVAL_MS);

    expect(readStatus).toHaveBeenCalledOnce();
    expect(controller.getState()).toEqual(aState("approved"));
    expect(states.at(-1)?.status).toBe("approved");
    controller.dispose();
  });

  it("keeps pending reads serial and bounded to thirty seconds", async () => {
    vi.useFakeTimers();
    const states: IdentityVerificationStatusControllerState[] = [];
    const first = deferred<{
      success: true;
      data: { status: "in_review" };
    }>();
    const second = deferred<{
      success: true;
      data: { status: "in_review" };
    }>();
    const readStatus = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockResolvedValue({
        success: true as const,
        data: { status: "in_review" as const },
      });
    const controller = createIdentityVerificationStatusController({
      readStatus,
      onStateChange: (state) => states.push(state),
      pollPending: true,
    });

    controller.start();
    expect(readStatus).toHaveBeenCalledOnce();
    first.resolve({ success: true, data: { status: "in_review" } });
    await Promise.resolve();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(IDENTITY_STATUS_POLL_INTERVAL_MS);
    expect(readStatus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(IDENTITY_STATUS_POLL_INTERVAL_MS);
    expect(readStatus).toHaveBeenCalledTimes(2);

    second.resolve({ success: true, data: { status: "in_review" } });
    await vi.advanceTimersByTimeAsync(IDENTITY_STATUS_POLL_TIMEOUT_MS);

    expect(states.at(-1)?.timedOut).toBe(true);
    expect(readStatus.mock.calls.length).toBeGreaterThan(2);
    controller.dispose();
    vi.useRealTimers();
  });

  it("refreshes manually without starting an overlapping request", async () => {
    const first = deferred<{
      success: true;
      data: { status: "in_review" };
    }>();
    const readStatus = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({
      success: true as const,
      data: { status: "approved" as const },
    });
    const states: IdentityVerificationStatusControllerState[] = [];
    const controller = createIdentityVerificationStatusController({
      readStatus,
      onStateChange: (state) => states.push(state),
    });

    controller.start();
    controller.refresh();
    expect(readStatus).toHaveBeenCalledOnce();

    first.resolve({ success: true, data: { status: "in_review" } });
    await Promise.resolve();
    await Promise.resolve();
    controller.refresh();
    await Promise.resolve();
    await Promise.resolve();

    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(states.at(-1)?.status).toBe("approved");
    controller.dispose();
  });

  it("ignores a late response after disposal", async () => {
    const pending = deferred<{
      success: true;
      data: { status: "approved" };
    }>();
    const onStateChange = vi.fn();
    const controller = createIdentityVerificationStatusController({
      readStatus: vi.fn().mockReturnValue(pending.promise),
      onStateChange,
    });

    controller.start();
    controller.dispose();
    const callsBeforeResponse = onStateChange.mock.calls.length;
    pending.resolve({ success: true, data: { status: "approved" } });
    await Promise.resolve();
    await Promise.resolve();

    expect(onStateChange).toHaveBeenCalledTimes(callsBeforeResponse);
    expect(controller.getState().status).toBeNull();
  });
});
