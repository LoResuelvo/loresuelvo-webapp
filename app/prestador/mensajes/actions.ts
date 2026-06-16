"use server";

import { ApiConversationRepository } from "@/infrastructure/repositories/api-conversation-repository";
import { ApiJobRequestRepository } from "@/infrastructure/repositories/api-job-request-repository";
import {
  getConversationDetail as getConvDetailUseCase,
  getJobRequestForConversation as getJobReqUseCase,
} from "@/application/messaging/get-conversation-detail";
import {
  createConversation as createConvUseCase,
  sendMessage as sendMsgUseCase,
} from "@/application/messaging/send-message";
import { acceptWorkRequest } from "@/application/provider/accept-work-request";
import { ConversationDetail } from "@/domain/messaging/types";
import { JobRequestSummary } from "@/ports/job-request-repository";

export async function getConversationDetail(id: string): Promise<ConversationDetail> {
  const repository = new ApiConversationRepository();
  return getConvDetailUseCase(repository, id);
}

export async function createConversation(consumerId: number, content: string): Promise<{ id: number }> {
  const repository = new ApiConversationRepository();
  return createConvUseCase(repository, consumerId, content);
}

export async function sendMessage(conversationId: string, content: string): Promise<unknown> {
  const repository = new ApiConversationRepository();
  return sendMsgUseCase(repository, conversationId, content);
}

export async function acceptJobRequest(jobRequestId: number): Promise<void> {
  const repository = new ApiJobRequestRepository();
  return acceptWorkRequest(repository, jobRequestId);
}

export async function getJobRequestForConversation(conversationId: string): Promise<JobRequestSummary | null> {
  const repository = new ApiJobRequestRepository();
  return getJobReqUseCase(repository, conversationId);
}
