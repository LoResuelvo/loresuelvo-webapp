import { api } from "@/infrastructure/api/base-client";
import { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";
import {
  WorkOrder,
  WorkOrderDetail,
  CompletionReport,
  CompletionReportInput,
  WorkOrderReview,
  WorkOrderReviewInput,
} from "@/domain/work-order/types";
import {
  ApiWorkOrder,
  ApiWorkOrderDetail,
  ApiCompletionReport,
  ApiCompletionReportInput,
  CreateWorkOrderReviewResponse,
} from "@/infrastructure/api/types";
import {
  transformApiToWorkOrder,
  transformApiToWorkOrderDetail,
  transformApiToCompletionReport,
  toCreateReviewRequest,
  toWorkOrderReview,
} from "./work-order-mapper";

export class ApiWorkOrderRepository implements WorkOrderRepository {
  async getByServiceProposalId(serviceProposalId: number): Promise<WorkOrder | null> {
    const res = await api.get<ApiWorkOrder | ApiWorkOrder[] | null>(
      `/work-orders?service_proposal_id=${serviceProposalId}`
    );

    if (!res) {
      return null;
    }

    if (Array.isArray(res)) {
      if (res.length === 0) return null;
      const matched = res.find((order) => order.service_proposal_id === serviceProposalId);
      return matched ? transformApiToWorkOrder(matched) : null;
    }

    return transformApiToWorkOrder(res);
  }

  async getById(workOrderId: number): Promise<WorkOrder | null> {
    const res = await api.get<ApiWorkOrder | null>(`/work-orders/${workOrderId}`);
    if (!res) {
      return null;
    }
    return transformApiToWorkOrder(res);
  }

  async getDetail(workOrderId: number): Promise<WorkOrderDetail> {
    const res = await api.get<ApiWorkOrderDetail>(`/work-orders/${workOrderId}`);
    return transformApiToWorkOrderDetail(res);
  }

  async reportCompletion(
    workOrderId: number,
    input: CompletionReportInput
  ): Promise<CompletionReport> {
    const payload: ApiCompletionReportInput = {
      description: input.description,
      image_file_ids: input.imageFileIds,
    };

    const res = await api.post<ApiCompletionReport>(
      `/work-orders/${workOrderId}/completion-reports`,
      payload
    );

    return transformApiToCompletionReport(res);
  }

  async createReview(
    workOrderId: number,
    input: WorkOrderReviewInput
  ): Promise<WorkOrderReview> {
    const payload = toCreateReviewRequest(input);
    const res = await api.post<CreateWorkOrderReviewResponse>(
      `/work-orders/${workOrderId}/reviews`,
      payload
    );
    return toWorkOrderReview(res);
  }
}

