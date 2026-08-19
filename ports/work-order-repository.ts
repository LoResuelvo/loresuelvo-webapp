import { WorkOrder, CompletionReport, CompletionReportInput } from "@/domain/work-order/types";

export interface WorkOrderRepository {
  getByServiceProposalId(serviceProposalId: number): Promise<WorkOrder | null>;
  getById(workOrderId: number): Promise<WorkOrder | null>;
  reportCompletion(workOrderId: number, input: CompletionReportInput): Promise<CompletionReport>;
}
