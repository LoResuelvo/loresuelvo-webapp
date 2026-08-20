import {
  WorkOrder,
  WorkOrderDetail,
  CompletionReport,
  CompletionReportInput,
} from "@/domain/work-order/types";

export interface WorkOrderRepository {
  getByServiceProposalId(serviceProposalId: number): Promise<WorkOrder | null>;
  getById(workOrderId: number): Promise<WorkOrder | null>;
  getDetail(workOrderId: number): Promise<WorkOrderDetail>;
  reportCompletion(workOrderId: number, input: CompletionReportInput): Promise<CompletionReport>;
}
