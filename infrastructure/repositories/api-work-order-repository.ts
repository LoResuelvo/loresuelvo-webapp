import { api } from "@/infrastructure/api/base-client";
import { WorkOrderRepository } from "@/ports/work-order-repository";
import { WorkOrder, CompletionReport, CompletionReportInput } from "@/domain/work-order/types";
import { ApiWorkOrder, ApiCompletionReport, ApiCompletionReportInput } from "@/infrastructure/api/types";
import { transformApiToWorkOrder, transformApiToCompletionReport } from "./work-order-mapper";

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
      return transformApiToWorkOrder(res[0]);
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

  async reportCompletion(
    workOrderId: number,
    input: CompletionReportInput
  ): Promise<CompletionReport> {
    const payload: ApiCompletionReportInput = {
      description: input.description,
      image_file_ids: input.imageFileIds,
    };

    const res = await api.post<ApiCompletionReport>(
      `/work-orders/${workOrderId}/completion-report`,
      payload
    );

    return transformApiToCompletionReport(res);
  }
}
