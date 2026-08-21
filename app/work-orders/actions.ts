"use server";

import { createServiceBalanceCheckout } from "@/application/payments/create-service-balance-checkout";
import { getWorkOrderByProposal } from "@/application/work-orders/get-work-order";
import { getWorkOrderDetail } from "@/application/work-orders/get-work-order-detail";
import { reportWorkCompletion } from "@/application/work-orders/report-work-completion";
import type { CheckoutSession } from "@/domain/payment/types";
import type { WorkOrder, WorkOrderDetail, CompletionReport } from "@/domain/work-order/types";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { ApiPaymentRepository } from "@/infrastructure/repositories/api-payment-repository";
import { ApiWorkOrderRepository } from "@/infrastructure/repositories/api-work-order-repository";

export type CreateServiceBalanceCheckoutResult =
  | { ok: true; checkout: CheckoutSession }
  | { ok: false; status: number | null };

export type GetWorkOrderResult =
  | { ok: true; workOrder: WorkOrder | null }
  | { ok: false; status: number | null };

export type GetWorkOrderDetailResult =
  | { ok: true; detail: WorkOrderDetail }
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

export async function getWorkOrderDetailAction(
  workOrderId: number
): Promise<GetWorkOrderDetailResult> {
  try {
    const repository = new ApiWorkOrderRepository();
    const detail = await getWorkOrderDetail(repository, workOrderId);
    return { ok: true, detail };
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

export async function createServiceBalanceCheckoutAction(
  workOrderId: number,
): Promise<CreateServiceBalanceCheckoutResult> {
  try {
    const repository = new ApiPaymentRepository();
    const checkout = await createServiceBalanceCheckout(repository, workOrderId);
    return { ok: true, checkout };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
    };
  }
}
