import { ApiWorkOrder, ApiWorkOrderDetail, ApiCompletionReport } from "@/infrastructure/api/types";
import { WorkOrder, WorkOrderDetail, CompletionReport } from "@/domain/work-order/types";

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
