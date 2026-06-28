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
import { ConversationDetailInfo } from "@/domain/messaging/types";
import { JobRequestSummary } from "@/ports/job-request-repository";

export async function getConversationDetail(id: string): Promise<ConversationDetailInfo> {
  const repository = new ApiConversationRepository();
  return getConvDetailUseCase(repository, id);
}

export async function createConversation(providerId: number, content?: string, imageFileIds?: string[]): Promise<{ id: number }> {
  const repository = new ApiConversationRepository();
  return createConvUseCase(repository, providerId, content, imageFileIds);
}

export async function sendMessage(conversationId: string, content?: string, imageFileIds?: string[]): Promise<unknown> {
  const repository = new ApiConversationRepository();
  return sendMsgUseCase(repository, conversationId, content, imageFileIds);
}

export async function getJobRequestForConversation(conversationId: string): Promise<JobRequestSummary | null> {
  const repository = new ApiJobRequestRepository();
  return getJobReqUseCase(repository, conversationId);
}
