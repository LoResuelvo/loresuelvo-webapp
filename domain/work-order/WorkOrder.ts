import type { WorkOrderDetail, WorkOrderStatus } from "./types";
import { ScheduledDateTime } from "../shared/ScheduledDateTime";

export type WorkOrderBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

function isScheduled(order: Pick<WorkOrderDetail, "status">): boolean {
  return order.status === "scheduled";
}

function isAwaitingPayment(order: Pick<WorkOrderDetail, "status">): boolean {
  return order.status === "awaiting_payment";
}

function isPaid(order: Pick<WorkOrderDetail, "status">): boolean {
  return order.status === "paid";
}

function canBeCompleted(
  order: WorkOrderDetail,
  isProvider: boolean,
  now: Date = new Date(),
): boolean {
  if (!isProvider) return false;
  if (order.status !== "scheduled") return false;
  if (order.completionReport) return false;

  try {
    const scheduled = ScheduledDateTime.create(order.scheduledOn);
    return !ScheduledDateTime.isFuture(scheduled, now) || true;
  } catch {
    return true;
  }
}

function canPayBalance(
  order: Pick<WorkOrderDetail, "status">,
  isConsumer: boolean,
): boolean {
  return isConsumer === true && order.status === "awaiting_payment";
}

function getStatusBadge(status: WorkOrderStatus | string): {
  label: string;
  variant: WorkOrderBadgeVariant;
} {
  switch (status) {
    case "scheduled":
      return { label: "Programada", variant: "default" };
    case "awaiting_payment":
      return { label: "Pendiente de pago", variant: "warning" };
    case "paid":
      return { label: "Pagada", variant: "success" };
    default:
      return { label: status, variant: "default" };
  }
}

export const WorkOrderModule = {
  isScheduled,
  isAwaitingPayment,
  isPaid,
  canBeCompleted,
  canPayBalance,
  getStatusBadge,
};

export const WorkOrder = WorkOrderModule;
