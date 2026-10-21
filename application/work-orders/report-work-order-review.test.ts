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

  it("trims Go whitespace and omits an empty optional explanation", async () => {
    const receipt = { id: 71, status: "pending" as const };
    vi.mocked(mockRepository.reportReview).mockResolvedValue(receipt);

    await reportWorkOrderReview(mockRepository, 10, {
      category: "personal_data",
      explanation: " \u0085 comparte mi teléfono \u3000 ",
    });

    expect(mockRepository.reportReview).toHaveBeenCalledWith(10, {
      category: "personal_data",
      explanation: "comparte mi teléfono",
    });
  });

  it("rejects invalid input before calling the repository", async () => {
    await expect(
      reportWorkOrderReview(mockRepository, 10, {
        category: "unknown",
      })
    ).rejects.toMatchObject({
      name: "WorkOrderReviewReportValidationException",
      validationError: "invalid_category",
    });

    expect(mockRepository.reportReview).not.toHaveBeenCalled();
  });

  it("propagates repository errors", async () => {
    vi.mocked(mockRepository.reportReview).mockRejectedValue(new Error("Network Error"));

    await expect(
      reportWorkOrderReview(mockRepository, 10, { category: "spam_advertising" })
    ).rejects.toThrow("Network Error");
  });
});
