import { describe, expect, it } from "vitest";
import { WorkOrderModule } from "./WorkOrder";
import type { WorkOrderDetail } from "./types";

describe("WorkOrder Domain Module", () => {
  const sampleWorkOrder: WorkOrderDetail = {
    id: 101,
    serviceProposalId: 50,
    consumerId: 1,
    providerId: 2,
    amountCents: 2000000,
    scheduledOn: "2026-07-05T10:00:00.000Z",
    description: "Reparación de filtración",
    status: "scheduled",
    acceptedOn: "2026-07-04T10:00:00.000Z",
  };

  describe("status checks", () => {
    it("identifies status correctly", () => {
      expect(WorkOrderModule.isScheduled(sampleWorkOrder)).toBe(true);
      expect(WorkOrderModule.isAwaitingPayment(sampleWorkOrder)).toBe(false);
      expect(WorkOrderModule.isPaid(sampleWorkOrder)).toBe(false);

      const awaiting = { ...sampleWorkOrder, status: "awaiting_payment" as const };
      expect(WorkOrderModule.isScheduled(awaiting)).toBe(false);
      expect(WorkOrderModule.isAwaitingPayment(awaiting)).toBe(true);
      expect(WorkOrderModule.isPaid(awaiting)).toBe(false);

      const paid = { ...sampleWorkOrder, status: "paid" as const, paidOn: "2026-07-05T12:00:00Z" };
      expect(WorkOrderModule.isScheduled(paid)).toBe(false);
      expect(WorkOrderModule.isAwaitingPayment(paid)).toBe(false);
      expect(WorkOrderModule.isPaid(paid)).toBe(true);
    });
  });

  describe("canBeCompleted", () => {
    it("allows provider to complete scheduled work order when no completion report exists", () => {
      const now = new Date("2026-07-05T11:00:00.000Z");
      expect(WorkOrderModule.canBeCompleted(sampleWorkOrder, true, now)).toBe(true);
    });

    it("prevents consumer from completing work order", () => {
      expect(WorkOrderModule.canBeCompleted(sampleWorkOrder, false)).toBe(false);
    });

    it("prevents completing when status is not scheduled", () => {
      const awaiting = { ...sampleWorkOrder, status: "awaiting_payment" as const };
      expect(WorkOrderModule.canBeCompleted(awaiting, true)).toBe(false);

      const paid = { ...sampleWorkOrder, status: "paid" as const };
      expect(WorkOrderModule.canBeCompleted(paid, true)).toBe(false);
    });

    it("prevents completing if already has completion report", () => {
      const alreadyReported: WorkOrderDetail = {
        ...sampleWorkOrder,
        completionReport: {
          id: 1,
          description: "Trabajo terminado",
          reportedOn: "2026-07-05T11:00:00Z",
          images: [],
        },
      };
      expect(WorkOrderModule.canBeCompleted(alreadyReported, true)).toBe(false);
    });
  });

  describe("canPayBalance", () => {
    it("allows consumer to pay balance when order status is awaiting_payment", () => {
      const awaiting = { ...sampleWorkOrder, status: "awaiting_payment" as const };
      expect(WorkOrderModule.canPayBalance(awaiting, true)).toBe(true);
    });

    it("prevents provider from paying balance", () => {
      const awaiting = { ...sampleWorkOrder, status: "awaiting_payment" as const };
      expect(WorkOrderModule.canPayBalance(awaiting, false)).toBe(false);
    });

    it("prevents consumer from paying balance when order status is scheduled or paid", () => {
      const scheduled = { ...sampleWorkOrder, status: "scheduled" as const };
      expect(WorkOrderModule.canPayBalance(scheduled, true)).toBe(false);

      const paid = { ...sampleWorkOrder, status: "paid" as const };
      expect(WorkOrderModule.canPayBalance(paid, true)).toBe(false);
    });
  });

  describe("getStatusBadge", () => {
    it("returns correct badge for scheduled", () => {
      expect(WorkOrderModule.getStatusBadge("scheduled")).toEqual({
        label: "Programada",
        variant: "default",
      });
    });

    it("returns correct badge for awaiting_payment", () => {
      expect(WorkOrderModule.getStatusBadge("awaiting_payment")).toEqual({
        label: "Pendiente de pago",
        variant: "warning",
      });
    });

    it("returns correct badge for paid", () => {
      expect(WorkOrderModule.getStatusBadge("paid")).toEqual({
        label: "Pagada",
        variant: "success",
      });
    });
  });
});
