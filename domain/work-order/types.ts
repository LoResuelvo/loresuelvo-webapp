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

export interface CompletionImage {
  fileId: string;
  originalName: string;
  url: string;
}

export interface CompletionReportDetail {
  id: number;
  description: string;
  reportedOn: string;
  images: CompletionImage[];
}

export interface WorkOrderReviewInput {
  rating: number;
  comment?: string;
  description?: string;
}

export interface WorkOrderReview {
  rating: number;
  comment?: string;
  description?: string;
  createdOn?: string;
}

export interface WorkOrderDetail {
  id: number;
  serviceProposalId: number;
  consumerId: number;
  providerId: number;
  amountCents: number;
  scheduledOn: string;
  description: string;
  status: WorkOrderStatus;
  acceptedOn: string;
  paidOn?: string;
  completionReport?: CompletionReportDetail;
  review?: WorkOrderReview;
}
