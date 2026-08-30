import { describe, expect, it, vi, beforeEach } from "vitest";
import { createWorkOrderReview } from "./create-work-order-review";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

describe("createWorkOrderReview Use Case", () => {
  let mockRepository: WorkOrderRepository;

  beforeEach(() => {
    mockRepository = {
      getByServiceProposalId: vi.fn(),
      getById: vi.fn(),
      getDetail: vi.fn(),
      reportCompletion: vi.fn(),
      createReview: vi.fn(),
    };
  });

  it("calls repository.createReview when input is valid and returns the review", async () => {
    const expectedReview = {
      rating: 5,
      comment: "Excelente servicio",
      createdOn: "2026-08-21T15:00:00Z",
    };
    vi.mocked(mockRepository.createReview).mockResolvedValue(expectedReview);

    const result = await createWorkOrderReview(mockRepository, 10, {
      rating: 5,
      comment: "Excelente servicio",
    });

    expect(mockRepository.createReview).toHaveBeenCalledWith(10, {
      rating: 5,
      comment: "Excelente servicio",
    });
    expect(result).toEqual(expectedReview);
  });

  it("throws validation error and does not call repository when input is invalid", async () => {
    await expect(
      createWorkOrderReview(mockRepository, 10, {
        rating: 0,
      })
    ).rejects.toThrow("Rating must be an integer between 1 and 5");

    expect(mockRepository.createReview).not.toHaveBeenCalled();
  });

  it("propagates repository errors without catching or swallowing them", async () => {
    vi.mocked(mockRepository.createReview).mockRejectedValue(new Error("Network Error"));

    await expect(
      createWorkOrderReview(mockRepository, 10, {
        rating: 4,
      })
    ).rejects.toThrow("Network Error");
  });
});
