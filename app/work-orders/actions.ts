"use server";

import { getWorkOrderByProposal } from "@/application/work-orders/get-work-order";
import { reportWorkCompletion } from "@/application/work-orders/report-work-completion";
import type { WorkOrder, CompletionReport } from "@/domain/work-order/types";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { ApiWorkOrderRepository } from "@/infrastructure/repositories/api-work-order-repository";

export type GetWorkOrderResult =
  | { ok: true; workOrder: WorkOrder | null }
  | { ok: false; status: number | null };

export type ReportWorkCompletionResult =
  | { ok: true; report: CompletionReport }
  | { ok: false; status: number | null; message?: string | null };

export async function getWorkOrderByProposalAction(
  serviceProposalId: number
): Promise<GetWorkOrderResult> {
  try {
    const repository = new ApiWorkOrderRepository();
    const workOrder = await getWorkOrderByProposal(repository, serviceProposalId);
    return { ok: true, workOrder };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
    };
  }
}

export async function reportWorkCompletionAction(
  workOrderId: number,
  description: string,
  imageFileIds: string[]
): Promise<ReportWorkCompletionResult> {
  try {
    const repository = new ApiWorkOrderRepository();
    const report = await reportWorkCompletion(
      repository,
      workOrderId,
      description,
      imageFileIds
    );
    return { ok: true, report };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
      message: error instanceof ApiClientError ? error.message : null,
    };
  }
}
