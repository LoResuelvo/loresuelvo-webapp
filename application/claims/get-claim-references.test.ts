import { describe, expect, it, vi } from "vitest";
import { getClaimReferences } from "./get-claim-references";
import type { JobRequestRepository } from "@/ports/messaging/job-request-repository";
import type { ServiceProposalRepository } from "@/ports/messaging/service-proposal-repository";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

describe("getClaimReferences", () => {
  it("uses request and proposal details already loaded for claim choices", async () => {
    const requests = {
      list: vi.fn().mockResolvedValue([{
        id: 47,
        conversationId: 7,
        title: "Reparación de cañería",
        description: "Reparar una pérdida debajo de la pileta.",
        requester: { name: "Ana", surname: "Pérez" },
        images: [],
      }]),
    } as unknown as JobRequestRepository;
    const proposals = {
      getAll: vi.fn().mockResolvedValue([{
        id: 12,
        conversationId: 4,
        amountCents: 35000,
        scheduledOn: "2026-10-20T12:00:00Z",
        description: "Cambio de grifería",
        estimatedDurationMinutes: 90,
        status: "accepted",
        createdOn: "2026-10-19T12:00:00Z",
        counterpart: { id: 9, role: "provider", name: "María", surname: "Gómez" },
      }]),
    } as unknown as ServiceProposalRepository;

    const references = await getClaimReferences(requests, proposals);

    expect(references).toEqual([
      {
        reference: { kind: "job_request", id: 47 },
        context: {
          title: "Reparación de cañería",
          description: "Reparar una pérdida debajo de la pileta.",
          person: "Ana Pérez",
          personRole: "requester",
        },
      },
      {
        reference: { kind: "service_proposal", id: 12 },
        context: {
          title: "Cambio de grifería",
          scheduledOn: "2026-10-20T12:00:00Z",
          status: "accepted",
          person: "María Gómez",
          personRole: "counterpart",
        },
      },
    ]);
    expect(requests.list).toHaveBeenCalledTimes(1);
    expect(proposals.getAll).toHaveBeenCalledTimes(1);
  });

  it("includes the work order and enriches it with its linked proposal", async () => {
    const requests = { list: vi.fn().mockResolvedValue([]) } as unknown as JobRequestRepository;
    const proposals = {
      getAll: vi.fn().mockResolvedValue([{
        id: 12,
        conversationId: 4,
        amountCents: 1000,
        scheduledOn: "2026-10-20T12:00:00Z",
        description: "Reparación de cañería",
        estimatedDurationMinutes: 60,
        status: "accepted",
        createdOn: "2026-10-19T12:00:00Z",
        counterpart: { id: 9, role: "provider", name: "María", surname: "Gómez" },
      }]),
    } as unknown as ServiceProposalRepository;
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
    expect(references).toEqual([
      {
        reference: { kind: "service_proposal", id: 12 },
        context: {
          title: "Reparación de cañería",
          scheduledOn: "2026-10-20T12:00:00Z",
          status: "accepted",
          person: "María Gómez",
          personRole: "counterpart",
        },
      },
      {
        reference: { kind: "work_order", id: 88 },
        context: {
          title: "Reparación de cañería",
          scheduledOn: "2026-10-20T12:00:00Z",
          status: "scheduled",
          person: "María Gómez",
          personRole: "counterpart",
        },
      },
    ]);
  });
});
