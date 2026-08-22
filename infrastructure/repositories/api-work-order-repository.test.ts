import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiWorkOrderRepository } from "./api-work-order-repository";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiWorkOrder, ApiWorkOrderDetail, ApiCompletionReport } from "@/infrastructure/api/types";

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

    it("matches the specific work order by service_proposal_id when API returns an array", async () => {
      const order1: ApiWorkOrder = {
        id: 2,
        service_proposal_id: 2,
        status: "awaiting_payment",
        amount_cents: 400000,
        scheduled_on: "2026-08-10T10:00:00Z",
        description: "Trabajo 1",
        accepted_on: "2026-08-05T14:30:00Z",
      };
      const order2: ApiWorkOrder = {
        id: 4,
        service_proposal_id: 4,
        status: "scheduled",
        amount_cents: 500000,
        scheduled_on: "2026-08-27T10:00:00Z",
        description: "Trabajo 2",
        accepted_on: "2026-08-15T14:30:00Z",
      };

      vi.mocked(baseClient.api.get).mockResolvedValue([order1, order2]);

      const result = await repository.getByServiceProposalId(4);

      expect(baseClient.api.get).toHaveBeenCalledWith("/work-orders?service_proposal_id=4");
      expect(result).toEqual({
        id: 4,
        serviceProposalId: 4,
        status: "scheduled",
        amountCents: 500000,
        scheduledOn: "2026-08-27T10:00:00Z",
        description: "Trabajo 2",
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

  describe("getDetail", () => {
    it("calls GET /work-orders/:id and maps response to WorkOrderDetail", async () => {
      const mockApiDetail: ApiWorkOrderDetail = {
        id: 10,
        service_proposal_id: 42,
        consumer_id: 10,
        provider_id: 1,
        status: "scheduled",
        amount_cents: 1500000,
        scheduled_on: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        accepted_on: "2026-08-05T14:30:00Z",
      };

      vi.mocked(baseClient.api.get).mockResolvedValue(mockApiDetail);

      const result = await repository.getDetail(10);

      expect(baseClient.api.get).toHaveBeenCalledWith("/work-orders/10");
      expect(result).toEqual({
        id: 10,
        serviceProposalId: 42,
        consumerId: 10,
        providerId: 1,
        status: "scheduled",
        amountCents: 1500000,
        scheduledOn: "2026-08-20T10:00:00Z",
        description: "Reparación de cañería",
        acceptedOn: "2026-08-05T14:30:00Z",
      });
    });
  });

  describe("reportCompletion", () => {
    it("calls POST /work-orders/:id/completion-reports with correct snake_case body and maps response", async () => {
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

  describe("createReview", () => {
    it("calls POST /work-orders/:id/reviews with correct snake_case body and maps response to WorkOrderReview", async () => {
      const mockApiResponse = {
        rating: 5,
        description: "Excelente servicio",
        created_on: "2026-08-21T15:00:00Z",
      };

      vi.mocked(baseClient.api.post).mockResolvedValue(mockApiResponse);

      const result = await repository.createReview(10, {
        rating: 5,
        comment: "Excelente servicio",
      });

      expect(baseClient.api.post).toHaveBeenCalledWith("/work-orders/10/reviews", {
        rating: 5,
        description: "Excelente servicio",
      });

      expect(result).toEqual({
        rating: 5,
        comment: "Excelente servicio",
        description: "Excelente servicio",
        createdOn: "2026-08-21T15:00:00Z",
      });
    });
  });
});

