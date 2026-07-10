"use server";

import { ApiConversationRepository } from "@/infrastructure/repositories/api-conversation-repository";
import { ApiJobRequestRepository } from "@/infrastructure/repositories/api-job-request-repository";
import { ApiServiceProposalRepository } from "@/infrastructure/repositories/api-service-proposal-repository";
import {
  getConversationDetail as getConvDetailUseCase,
  getJobRequestForConversation as getJobReqUseCase,
} from "@/application/messaging/get-conversation-detail";
import {
  createConversation as createConvUseCase,
  sendMessage as sendMsgUseCase,
} from "@/application/messaging/send-message";
import { sendServiceProposal as sendServiceProposalUseCase } from "@/application/messaging/send-service-proposal";
import { acceptWorkRequest } from "@/application/provider/accept-work-request";
import { ConversationDetailInfo, CreateServiceProposalInput, ServiceProposal } from "@/domain/messaging/types";
import { JobRequestSummary } from "@/ports/job-request-repository";

export async function getConversationDetail(id: string): Promise<ConversationDetailInfo> {
  const repository = new ApiConversationRepository();
  return getConvDetailUseCase(repository, id);
}

export async function createConversation(consumerId: number, content?: string, imageFileIds?: string[]): Promise<{ id: number }> {
  const repository = new ApiConversationRepository();
  return createConvUseCase(repository, consumerId, content, imageFileIds);
}

export async function sendMessage(conversationId: string, content?: string, imageFileIds?: string[]): Promise<unknown> {
  const repository = new ApiConversationRepository();
  return sendMsgUseCase(repository, conversationId, content, imageFileIds);
}

export async function acceptJobRequest(jobRequestId: number): Promise<void> {
  const repository = new ApiJobRequestRepository();
  return acceptWorkRequest(repository, jobRequestId);
}

export async function getJobRequestForConversation(conversationId: string): Promise<JobRequestSummary | null> {
  const repository = new ApiJobRequestRepository();
  return getJobReqUseCase(repository, conversationId);
}

export async function createServiceProposal(input: CreateServiceProposalInput): Promise<{ success: boolean; data?: ServiceProposal; error?: string }> {
  try {
    const repository = new ApiServiceProposalRepository();
    const data = await sendServiceProposalUseCase(repository, input);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return { success: false, error: message };
  }
}

