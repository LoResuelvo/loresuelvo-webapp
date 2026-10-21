"use client";

import { useCallback, useSyncExternalStore } from "react";
import { reportWorkOrderReviewAction } from "@/app/work-orders/actions";
import type { WorkOrderReviewReportInput } from "@/domain/work-order/types";

type ReportResult = Awaited<ReturnType<typeof reportWorkOrderReviewAction>>;
type ReportStatus = "idle" | "pending" | "reported";

const reportStatusByWorkOrder = new Map<number, Exclude<ReportStatus, "idle">>();
const pendingReportByWorkOrder = new Map<number, Promise<ReportResult>>();
const reportStatusListeners = new Map<number, Set<() => void>>();

function getReportStatus(workOrderId: number): ReportStatus {
  return reportStatusByWorkOrder.get(workOrderId) ?? "idle";
}

function subscribeToReportStatus(workOrderId: number, listener: () => void): () => void {
  let listeners = reportStatusListeners.get(workOrderId);
  if (!listeners) {
    listeners = new Set();
    reportStatusListeners.set(workOrderId, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) reportStatusListeners.delete(workOrderId);
  };
}

function publishReportStatus(workOrderId: number, status: ReportStatus): void {
  if (status === "idle") reportStatusByWorkOrder.delete(workOrderId);
  else reportStatusByWorkOrder.set(workOrderId, status);

  for (const listener of [...(reportStatusListeners.get(workOrderId) ?? [])]) {
    listener();
  }
}

function submitReportForWorkOrder(
  workOrderId: number,
  input: WorkOrderReviewReportInput
): Promise<ReportResult> {
  const pendingReport = pendingReportByWorkOrder.get(workOrderId);
  if (pendingReport) return pendingReport;
  if (getReportStatus(workOrderId) === "reported") {
    return Promise.resolve({ ok: false, status: 409 });
  }

  publishReportStatus(workOrderId, "pending");
  const request = Promise.resolve()
    .then(() => reportWorkOrderReviewAction(workOrderId, input))
    .then(
      (result) => {
        publishReportStatus(
          workOrderId,
          result.ok || result.status === 409 ? "reported" : "idle"
        );
        return result;
      },
      (error: unknown) => {
        publishReportStatus(workOrderId, "idle");
        throw error;
      }
    )
    .finally(() => {
      pendingReportByWorkOrder.delete(workOrderId);
    });

  pendingReportByWorkOrder.set(workOrderId, request);
  return request;
}

const getServerReportStatus = (): ReportStatus => "idle";

export function useWorkOrderReviewReport(workOrderId: number) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeToReportStatus(workOrderId, listener),
    [workOrderId]
  );
  const getSnapshot = useCallback(() => getReportStatus(workOrderId), [workOrderId]);
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerReportStatus);
  const submitReport = useCallback(
    (input: WorkOrderReviewReportInput) => submitReportForWorkOrder(workOrderId, input),
    [workOrderId]
  );

  return {
    hasBeenReported: status === "reported",
    isPending: status === "pending",
    submitReport,
  };
}
