import { describe, expect, it, vi } from "vitest";
import { getClaimReferences } from "./get-claim-references";
import type { JobRequestRepository } from "@/ports/messaging/job-request-repository";
import type { ServiceProposalRepository } from "@/ports/messaging/service-proposal-repository";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

describe("getClaimReferences", () => {
  it("includes only the requested work order when the authenticated repository returns it", async () => {
    const requests = { list: vi.fn().mockResolvedValue([]) } as unknown as JobRequestRepository;
    const proposals = { getAll: vi.fn().mockResolvedValue([]) } as unknown as ServiceProposalRepository;
    const orders = {
      getById: vi.fn().mockResolvedValue({
        id: 88,
        serviceProposalId: 12,
        status: "scheduled",
        amountCents: 1000,
        scheduledOn: "2026-10-20T12:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-10-19T12:00:00Z",
      }),
    } as unknown as WorkOrderRepository;

    const references = await getClaimReferences(requests, proposals, { workOrderId: 88, orders });

    expect(orders.getById).toHaveBeenCalledWith(88);
    expect(references).toEqual([{ reference: { kind: "work_order", id: 88 }, title: "88" }]);
  });
});
