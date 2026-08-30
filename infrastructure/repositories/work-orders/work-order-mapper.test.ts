import { describe, expect, it } from "vitest";
import {
  transformApiToWorkOrder,
  transformApiToWorkOrderDetail,
  transformApiToCompletionReport,
  toCreateReviewRequest,
  toWorkOrderReview,
} from "./work-order-mapper";
import {
  ApiWorkOrder,
  ApiWorkOrderDetail,
  ApiCompletionReport,
  CreateWorkOrderReviewResponse,
} from "@/infrastructure/api/types";

describe("work-order-mapper", () => {
  it("transforms ApiWorkOrder to WorkOrder", () => {
    const api: ApiWorkOrder = {
      id: 10,
      service_proposal_id: 42,
      status: "scheduled",
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación",
      estimated_duration_minutes: 90,
      accepted_on: "2026-08-05T10:00:00Z",
    };

    const result = transformApiToWorkOrder(api);

    expect(result).toEqual({
      id: 10,
      serviceProposalId: 42,
      status: "scheduled",
      amountCents: 1500000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación",
      estimatedDurationMinutes: 90,
      acceptedOn: "2026-08-05T10:00:00Z",
    });
  });

  it("transforms ApiWorkOrderDetail to WorkOrderDetail", () => {
    const api: ApiWorkOrderDetail = {
      id: 10,
      service_proposal_id: 42,
      consumer_id: 10,
      provider_id: 1,
      status: "scheduled",
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería",
      estimated_duration_minutes: 120,
      accepted_on: "2026-08-05T10:00:00Z",
    };

    const result = transformApiToWorkOrderDetail(api);

    expect(result).toEqual({
      id: 10,
      serviceProposalId: 42,
      consumerId: 10,
      providerId: 1,
      status: "scheduled",
      amountCents: 1500000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería",
      estimatedDurationMinutes: 120,
      acceptedOn: "2026-08-05T10:00:00Z",
    });
  });

  it("transforms ApiWorkOrderDetail with completion_report", () => {
    const api: ApiWorkOrderDetail = {
      id: 10,
      service_proposal_id: 42,
      consumer_id: 10,
      provider_id: 1,
      status: "awaiting_payment",
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería",
      accepted_on: "2026-08-05T10:00:00Z",
      completion_report: {
        id: 1,
        description: "Trabajo terminado",
        reported_on: "2026-08-20T12:00:00Z",
        images: [
          {
            file_id: "file-01",
            original_name: "foto.jpg",
            url: "https://example.com/foto.jpg",
          },
        ],
      },
    };

    const result = transformApiToWorkOrderDetail(api);

    expect(result.completionReport).toEqual({
      id: 1,
      description: "Trabajo terminado",
      reportedOn: "2026-08-20T12:00:00Z",
      images: [
        {
          fileId: "file-01",
          originalName: "foto.jpg",
          url: "https://example.com/foto.jpg",
        },
      ],
    });
  });

  it("transforms ApiWorkOrderDetail with review", () => {
    const api: ApiWorkOrderDetail = {
      id: 10,
      service_proposal_id: 42,
      consumer_id: 10,
      provider_id: 1,
      status: "paid",
      amount_cents: 1500000,
      scheduled_on: "2026-08-20T10:00:00Z",
      description: "Reparación de cañería",
      accepted_on: "2026-08-05T10:00:00Z",
      paid_on: "2026-08-21T14:00:00Z",
      review: {
        rating: 5,
        comment: "Excelente trabajo",
        created_on: "2026-08-21T15:00:00Z",
      },
    };

    const result = transformApiToWorkOrderDetail(api);

    expect(result.review).toEqual({
      rating: 5,
      comment: "Excelente trabajo",
      description: "Excelente trabajo",
      createdOn: "2026-08-21T15:00:00Z",
    });
  });

  it("transforms ApiCompletionReport to CompletionReport", () => {
    const api: ApiCompletionReport = {
      id: 1,
      work_order_id: 10,
      description: "Finalizado",
      image_file_ids: ["img-1", "img-2"],
      created_on: "2026-08-20T12:00:00Z",
    };

    const result = transformApiToCompletionReport(api);

    expect(result).toEqual({
      id: 1,
      workOrderId: 10,
      description: "Finalizado",
      imageFileIds: ["img-1", "img-2"],
      createdOn: "2026-08-20T12:00:00Z",
    });
  });

  describe("toCreateReviewRequest", () => {
    it("transforms WorkOrderReviewInput to CreateWorkOrderReviewRequest with trimmed description", () => {
      const input = {
        rating: 5,
        comment: "  Gran trabajo  ",
      };

      const result = toCreateReviewRequest(input);

      expect(result).toEqual({
        rating: 5,
        description: "Gran trabajo",
      });
    });

    it("transforms WorkOrderReviewInput with rating only", () => {
      const input = {
        rating: 4,
      };

      const result = toCreateReviewRequest(input);

      expect(result).toEqual({
        rating: 4,
      });
    });
  });

  describe("toWorkOrderReview", () => {
    it("transforms CreateWorkOrderReviewResponse to WorkOrderReview", () => {
      const apiResponse: CreateWorkOrderReviewResponse = {
        rating: 5,
        description: "Excelente servicio",
        created_on: "2026-08-21T16:00:00Z",
      };

      const result = toWorkOrderReview(apiResponse);

      expect(result).toEqual({
        rating: 5,
        comment: "Excelente servicio",
        description: "Excelente servicio",
        createdOn: "2026-08-21T16:00:00Z",
      });
    });
  });
});

