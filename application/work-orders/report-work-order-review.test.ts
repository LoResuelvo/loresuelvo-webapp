import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportWorkOrderReview } from "./report-work-order-review";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

describe("reportWorkOrderReview Use Case", () => {
  let mockRepository: WorkOrderRepository;

  beforeEach(() => {
    mockRepository = {
      getByServiceProposalId: vi.fn(),
      getById: vi.fn(),
      getDetail: vi.fn(),
      reportCompletion: vi.fn(),
      createReview: vi.fn(),
      reportReview: vi.fn(),
    };
  });

  it("passes the report input to the repository and returns its receipt", async () => {
    const receipt = { id: 71, status: "pending" as const };
    vi.mocked(mockRepository.reportReview).mockResolvedValue(receipt);

    const result = await reportWorkOrderReview(mockRepository, 10, {
      category: "personal_data",
      explanation: "Publica mi teléfono sin autorización.",
    });

    expect(mockRepository.reportReview).toHaveBeenCalledWith(10, {
      category: "personal_data",
      explanation: "Publica mi teléfono sin autorización.",
    });
    expect(result).toEqual(receipt);
  });

  it("propagates repository errors", async () => {
    vi.mocked(mockRepository.reportReview).mockRejectedValue(new Error("Network Error"));

    await expect(
      reportWorkOrderReview(mockRepository, 10, { category: "spam_advertising" })
    ).rejects.toThrow("Network Error");
  });
});
