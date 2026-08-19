export type WorkOrderStatus = "scheduled" | "awaiting_payment" | "paid";

export interface WorkOrder {
  id: number;
  serviceProposalId: number;
  status: WorkOrderStatus;
  amountCents: number;
  scheduledOn: string;
  description: string;
  acceptedOn: string;
}

export interface CompletionReportInput {
  description: string;
  imageFileIds: string[];
}

export interface CompletionReport {
  id: number;
  workOrderId: number;
  description: string;
  imageFileIds: string[];
  createdOn: string;
}
