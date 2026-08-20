import {
  ApiWorkOrder,
  ApiWorkOrderDetail,
  ApiCompletionReport,
  ApiCompletionReportDetail,
} from "@/infrastructure/api/types";
import {
  WorkOrder,
  WorkOrderDetail,
  CompletionReport,
  CompletionReportDetail,
} from "@/domain/work-order/types";

export function transformApiToWorkOrder(api: ApiWorkOrder): WorkOrder {
  return {
    id: api.id,
    serviceProposalId: api.service_proposal_id,
    status: api.status,
    amountCents: api.amount_cents,
    scheduledOn: api.scheduled_on,
    description: api.description,
    acceptedOn: api.accepted_on,
  };
}

export function transformApiToCompletionReportDetail(
  api: ApiCompletionReportDetail
): CompletionReportDetail {
  return {
    id: api.id,
    description: api.description,
    reportedOn: api.reported_on,
    images: (api.images || []).map((img) => ({
      fileId: img.file_id,
      originalName: img.original_name,
      url: img.url,
    })),
  };
}

export function transformApiToWorkOrderDetail(api: ApiWorkOrderDetail): WorkOrderDetail {
  return {
    id: api.id,
    serviceProposalId: api.service_proposal_id,
    consumerId: api.consumer_id,
    providerId: api.provider_id,
    amountCents: api.amount_cents,
    scheduledOn: api.scheduled_on,
    description: api.description,
    status: api.status,
    acceptedOn: api.accepted_on,
    paidOn: api.paid_on,
    completionReport: api.completion_report
      ? transformApiToCompletionReportDetail(api.completion_report)
      : undefined,
    review: api.review
      ? {
          rating: api.review.rating,
          comment: api.review.comment,
          createdOn: api.review.created_on,
        }
      : undefined,
  };
}

export function transformApiToCompletionReport(api: ApiCompletionReport): CompletionReport {
  return {
    id: api.id,
    workOrderId: api.work_order_id,
    description: api.description,
    imageFileIds: api.image_file_ids,
    createdOn: api.created_on,
  };
}
