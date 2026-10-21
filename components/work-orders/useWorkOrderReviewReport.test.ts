import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkOrderReviewReportInput } from "@/domain/work-order/types";
import { reportWorkOrderReviewAction } from "@/app/work-orders/actions";
import { useWorkOrderReviewReport } from "./useWorkOrderReviewReport";

vi.mock("@/app/work-orders/actions", () => ({
  reportWorkOrderReviewAction: vi.fn(),
}));

describe("useWorkOrderReviewReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps one pending request across detail unmount and remount for the same order", async () => {
    let resolveReport:
      | ((result: { ok: false; status: number | null }) => void)
      | undefined;
    const pendingReport = new Promise<{ ok: false; status: number | null }>((resolve) => {
      resolveReport = resolve;
    });
    vi.mocked(reportWorkOrderReviewAction).mockReturnValue(pendingReport);

    const input: WorkOrderReviewReportInput = { category: "personal_data" };
    const firstDetail = renderHook(() => useWorkOrderReviewReport(51));

    let firstRequest!: ReturnType<typeof firstDetail.result.current.submitReport>;
    act(() => {
      firstRequest = firstDetail.result.current.submitReport(input);
    });
    expect(firstDetail.result.current.isPending).toBe(true);
    firstDetail.unmount();

    const reopenedDetail = renderHook(() => useWorkOrderReviewReport(51));
    expect(reopenedDetail.result.current.isPending).toBe(true);

    let reopenedRequest!: ReturnType<typeof reopenedDetail.result.current.submitReport>;
    act(() => {
      reopenedRequest = reopenedDetail.result.current.submitReport(input);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(reportWorkOrderReviewAction).toHaveBeenCalledTimes(1);
    expect(reopenedRequest).toBe(firstRequest);
    expect(reopenedDetail.result.current.isPending).toBe(true);

    await act(async () => {
      resolveReport?.({ ok: false, status: 409 });
      await firstRequest;
    });

    expect(reopenedDetail.result.current.isPending).toBe(false);
    expect(reopenedDetail.result.current.hasBeenReported).toBe(true);

    reopenedDetail.unmount();
    const detailAfterResolution = renderHook(() => useWorkOrderReviewReport(51));
    expect(detailAfterResolution.result.current.hasBeenReported).toBe(true);

    const duplicateResult = await detailAfterResolution.result.current.submitReport(input);
    expect(duplicateResult).toEqual({ ok: false, status: 409 });
    expect(reportWorkOrderReviewAction).toHaveBeenCalledTimes(1);
  });

  it("releases the order owner when a request fails so the provider can retry", async () => {
    let rejectReport: ((error: Error) => void) | undefined;
    const pendingReport = new Promise<never>((_resolve, reject) => {
      rejectReport = reject;
    });
    vi.mocked(reportWorkOrderReviewAction).mockReturnValue(pendingReport);

    const { result } = renderHook(() => useWorkOrderReviewReport(52));
    let request!: ReturnType<typeof result.current.submitReport>;
    act(() => {
      request = result.current.submitReport({ category: "spam_advertising" });
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      rejectReport?.(new Error("private backend detail"));
      await expect(request).rejects.toThrow("private backend detail");
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.hasBeenReported).toBe(false);
  });

  it("does not apply a report result to a different work order", async () => {
    let resolveReport:
      | ((result: { ok: true; receipt: { id: number; status: "pending" } }) => void)
      | undefined;
    const pendingReport = new Promise<{
      ok: true;
      receipt: { id: number; status: "pending" };
    }>((resolve) => {
      resolveReport = resolve;
    });
    vi.mocked(reportWorkOrderReviewAction).mockReturnValue(pendingReport);

    const { result, rerender } = renderHook(
      ({ workOrderId }: { workOrderId: number }) => useWorkOrderReviewReport(workOrderId),
      { initialProps: { workOrderId: 53 } }
    );

    let pendingRequest!: ReturnType<typeof result.current.submitReport>;
    act(() => {
      pendingRequest = result.current.submitReport({ category: "spam_advertising" });
    });
    rerender({ workOrderId: 54 });

    await act(async () => {
      resolveReport?.({ ok: true, receipt: { id: 71, status: "pending" } });
      await pendingRequest;
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.hasBeenReported).toBe(false);
  });
});
