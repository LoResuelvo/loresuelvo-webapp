import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/infrastructure/api/base-client";
import {
  getWorkOrderByProposalAction,
  reportWorkCompletionAction,
} from "./actions";
import { getWorkOrderByProposal } from "@/application/work-orders/get-work-order";
import { reportWorkCompletion } from "@/application/work-orders/report-work-completion";
import { WorkOrder, CompletionReport } from "@/domain/work-order/types";

vi.mock("@/application/work-orders/get-work-order", () => ({
  getWorkOrderByProposal: vi.fn(),
}));

vi.mock("@/application/work-orders/report-work-completion", () => ({
  reportWorkCompletion: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/api-work-order-repository", () => ({
  ApiWorkOrderRepository: vi.fn(),
}));

describe("getWorkOrderByProposalAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok: true and the work order when found", async () => {
    const mockWorkOrder: WorkOrder = {
      id: 10,
      serviceProposalId: 42,
      status: "scheduled",
      amountCents: 1500000,
      scheduledOn: "2026-08-20T10:00:00Z",
      description: "Reparación",
      acceptedOn: "2026-08-15T14:30:00Z",
    };

    vi.mocked(getWorkOrderByProposal).mockResolvedValue(mockWorkOrder);

    const result = await getWorkOrderByProposalAction(42);

    expect(result).toEqual({
      ok: true,
      workOrder: mockWorkOrder,
    });
  });

  it("returns ok: false with HTTP status when ApiClientError occurs", async () => {
    vi.mocked(getWorkOrderByProposal).mockRejectedValue(
      new ApiClientError(404, "Not Found", "Order not found")
    );

    const result = await getWorkOrderByProposalAction(42);

    expect(result).toEqual({
      ok: false,
      status: 404,
    });
  });

  it("returns ok: false with status null when unexpected error occurs", async () => {
    vi.mocked(getWorkOrderByProposal).mockRejectedValue(new Error("Unexpected error"));

    const result = await getWorkOrderByProposalAction(42);

    expect(result).toEqual({
      ok: false,
      status: null,
    });
  });
});

describe("reportWorkCompletionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok: true and the completion report when submission succeeds", async () => {
    const mockReport: CompletionReport = {
      id: 1,
      workOrderId: 10,
      description: "Trabajo terminado con fotos.",
      imageFileIds: ["file-1", "file-2"],
      createdOn: "2026-08-20T12:00:00Z",
    };

    vi.mocked(reportWorkCompletion).mockResolvedValue(mockReport);

    const result = await reportWorkCompletionAction(10, "Trabajo terminado con fotos.", [
      "file-1",
      "file-2",
    ]);

    expect(result).toEqual({
      ok: true,
      report: mockReport,
    });
  });

  it("returns ok: false with HTTP status 409 when order already has a report", async () => {
    vi.mocked(reportWorkCompletion).mockRejectedValue(
      new ApiClientError(409, "Conflict", "Order already reported")
    );

    const result = await reportWorkCompletionAction(10, "Trabajo terminado", ["file-1"]);

    expect(result).toEqual({
      ok: false,
      status: 409,
    });
  });

  it("returns ok: false with HTTP status 400 when input validation fails in backend", async () => {
    vi.mocked(reportWorkCompletion).mockRejectedValue(
      new ApiClientError(400, "Bad Request", "Missing description or invalid images")
    );

    const result = await reportWorkCompletionAction(10, "", []);

    expect(result).toEqual({
      ok: false,
      status: 400,
    });
  });

  it("returns ok: false with status null when unexpected error occurs", async () => {
    vi.mocked(reportWorkCompletion).mockRejectedValue(new Error("Network failure"));

    const result = await reportWorkCompletionAction(10, "Trabajo terminado", ["file-1"]);

    expect(result).toEqual({
      ok: false,
      status: null,
    });
  });
});
