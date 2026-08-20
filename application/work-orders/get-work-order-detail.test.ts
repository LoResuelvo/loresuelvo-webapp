import { describe, expect, it, vi } from "vitest";
import type { WorkOrderRepository } from "@/ports/work-order-repository";
import type { WorkOrderDetail } from "@/domain/work-order/types";
import { getWorkOrderDetail } from "./get-work-order-detail";

describe("getWorkOrderDetail", () => {
  it("should return the work order detail from repository", async () => {
    const mockDetail: WorkOrderDetail = {
      id: 10,
      serviceProposalId: 42,
      consumerId: 10,
      providerId: 1,
      status: "scheduled",
      amountCents: 1500000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería en cocina",
      acceptedOn: "2026-08-05T10:00:00Z",
    };

    const repository = {
      getDetail: vi.fn().mockResolvedValue(mockDetail),
    } as unknown as WorkOrderRepository;

    const result = await getWorkOrderDetail(repository, 10);

    expect(result).toEqual(mockDetail);
    expect(repository.getDetail).toHaveBeenCalledWith(10);
  });

  it("should propagate errors when repository fails", async () => {
    const repository = {
      getDetail: vi.fn().mockRejectedValue(new Error("Repository error")),
    } as unknown as WorkOrderRepository;

    await expect(getWorkOrderDetail(repository, 10)).rejects.toThrow("Repository error");
  });
});
