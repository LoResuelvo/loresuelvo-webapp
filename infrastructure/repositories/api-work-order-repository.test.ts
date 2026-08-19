import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiWorkOrderRepository } from "./api-work-order-repository";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiWorkOrder, ApiCompletionReport } from "@/infrastructure/api/types";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ApiWorkOrderRepository", () => {
  let repository: ApiWorkOrderRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiWorkOrderRepository();
  });

  describe("getByServiceProposalId", () => {
    it("calls GET /work-orders?service_proposal_id=:id and maps to domain WorkOrder", async () => {
      const mockApiWorkOrder: ApiWorkOrder = {
        id: 10,
        service_proposal_id: 42,
        status: "scheduled",
        amount_cents: 1500000,
        scheduled_on: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        accepted_on: "2026-08-15T14:30:00Z",
      };

      vi.mocked(baseClient.api.get).mockResolvedValue(mockApiWorkOrder);

      const result = await repository.getByServiceProposalId(42);

      expect(baseClient.api.get).toHaveBeenCalledWith("/work-orders?service_proposal_id=42");
      expect(result).toEqual({
        id: 10,
        serviceProposalId: 42,
        status: "scheduled",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-15T14:30:00Z",
      });
    });

    it("returns null if the API returns null or empty response", async () => {
      vi.mocked(baseClient.api.get).mockResolvedValue(null);

      const result = await repository.getByServiceProposalId(999);

      expect(baseClient.api.get).toHaveBeenCalledWith("/work-orders?service_proposal_id=999");
      expect(result).toBeNull();
    });

    it("returns first element if API returns an array", async () => {
      const mockApiWorkOrder: ApiWorkOrder = {
        id: 10,
        service_proposal_id: 42,
        status: "scheduled",
        amount_cents: 1500000,
        scheduled_on: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        accepted_on: "2026-08-15T14:30:00Z",
      };

      vi.mocked(baseClient.api.get).mockResolvedValue([mockApiWorkOrder]);

      const result = await repository.getByServiceProposalId(42);

      expect(baseClient.api.get).toHaveBeenCalledWith("/work-orders?service_proposal_id=42");
      expect(result).toEqual({
        id: 10,
        serviceProposalId: 42,
        status: "scheduled",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-15T14:30:00Z",
      });
    });
  });

  describe("getById", () => {
    it("calls GET /work-orders/:id and maps response", async () => {
      const mockApiWorkOrder: ApiWorkOrder = {
        id: 10,
        service_proposal_id: 42,
        status: "awaiting_payment",
        amount_cents: 1500000,
        scheduled_on: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        accepted_on: "2026-08-15T14:30:00Z",
      };

      vi.mocked(baseClient.api.get).mockResolvedValue(mockApiWorkOrder);

      const result = await repository.getById(10);

      expect(baseClient.api.get).toHaveBeenCalledWith("/work-orders/10");
      expect(result).toEqual({
        id: 10,
        serviceProposalId: 42,
        status: "awaiting_payment",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-15T14:30:00Z",
      });
    });
  });

  describe("reportCompletion", () => {
    it("calls POST /work-orders/:id/completion-report with correct snake_case body and maps response", async () => {
      const mockApiResponse: ApiCompletionReport = {
        id: 1,
        work_order_id: 10,
        description: "Se finalizó el trabajo correctamente con cambio de caños.",
        image_file_ids: ["file-1", "file-2"],
        created_on: "2026-08-20T12:00:00Z",
      };

      vi.mocked(baseClient.api.post).mockResolvedValue(mockApiResponse);

      const result = await repository.reportCompletion(10, {
        description: "Se finalizó el trabajo correctamente con cambio de caños.",
        imageFileIds: ["file-1", "file-2"],
      });

      expect(baseClient.api.post).toHaveBeenCalledWith("/work-orders/10/completion-reports", {
        description: "Se finalizó el trabajo correctamente con cambio de caños.",
        image_file_ids: ["file-1", "file-2"],
      });

      expect(result).toEqual({
        id: 1,
        workOrderId: 10,
        description: "Se finalizó el trabajo correctamente con cambio de caños.",
        imageFileIds: ["file-1", "file-2"],
        createdOn: "2026-08-20T12:00:00Z",
      });
    });
  });
});
