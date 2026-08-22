import {
  ApiWorkOrder,
  ApiWorkOrderDetail,
  ApiCompletionReport,
  ApiCompletionReportDetail,
  CreateWorkOrderReviewRequest,
  CreateWorkOrderReviewResponse,
  ApiWorkOrderReview,
} from "@/infrastructure/api/types";
import {
  WorkOrder,
  WorkOrderDetail,
  CompletionReport,
  CompletionReportDetail,
  WorkOrderReview,
  WorkOrderReviewInput,
} from "@/domain/work-order/types";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { Rating } from "@/domain/shared/Rating";

export function transformApiToWorkOrder(api: ApiWorkOrder): WorkOrder {
  const money = Money.create(api.amount_cents);
  const scheduledOn = ScheduledDateTime.create(api.scheduled_on);
  const acceptedOn = ScheduledDateTime.create(api.accepted_on);

  return {
    id: api.id,
    serviceProposalId: api.service_proposal_id,
    status: api.status,
    amountCents: money.cents,
    scheduledOn: scheduledOn.isoString,
    description: api.description,
    acceptedOn: acceptedOn.isoString,
  };
}

export function transformApiToCompletionReportDetail(
  api: ApiCompletionReportDetail
): CompletionReportDetail {
  const reportedOn = ScheduledDateTime.create(api.reported_on);
  return {
    id: api.id,
    description: api.description,
    reportedOn: reportedOn.isoString,
    images: (api.images || []).map((img) => ({
      fileId: img.file_id,
      originalName: img.original_name,
      url: img.url,
    })),
  };
}

export function toCreateReviewRequest(
  input: WorkOrderReviewInput
): CreateWorkOrderReviewRequest {
  const desc = (input.description ?? input.comment ?? "").trim();
  return {
    rating: input.rating,
    ...(desc ? { description: desc } : {}),
  };
}

export function toWorkOrderReview(
  api: CreateWorkOrderReviewResponse | ApiWorkOrderReview
): WorkOrderReview {
  const text = api.description ?? api.comment;
  return {
    rating: Rating.create(api.rating).value,
    ...(text ? { comment: text, description: text } : {}),
    ...(api.created_on ? { createdOn: ScheduledDateTime.create(api.created_on).isoString } : {}),
  };
}

export function transformApiToWorkOrderDetail(api: ApiWorkOrderDetail): WorkOrderDetail {
  const money = Money.create(api.amount_cents);
  const scheduledOn = ScheduledDateTime.create(api.scheduled_on);
  const acceptedOn = ScheduledDateTime.create(api.accepted_on);
  if (api.paid_on) {
    ScheduledDateTime.create(api.paid_on);
  }

  const result: WorkOrderDetail = {
    id: api.id,
    serviceProposalId: api.service_proposal_id,
    consumerId: api.consumer_id,
    providerId: api.provider_id,
    amountCents: money.cents,
    scheduledOn: scheduledOn.isoString,
    description: api.description,
    status: api.status,
    acceptedOn: acceptedOn.isoString,
  };

  if (api.paid_on) {
    result.paidOn = api.paid_on;
  }
  if (api.completion_report) {
    result.completionReport = transformApiToCompletionReportDetail(api.completion_report);
  }
  if (api.review) {
    result.review = toWorkOrderReview(api.review);
  }

  return result;
}

export function transformApiToCompletionReport(api: ApiCompletionReport): CompletionReport {
  const createdOn = ScheduledDateTime.create(api.created_on);
  return {
    id: api.id,
    workOrderId: api.work_order_id,
    description: api.description,
    imageFileIds: api.image_file_ids,
    createdOn: createdOn.isoString,
  };
}

