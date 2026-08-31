"use server";

import { ApiConversationQueryRepository } from "@/infrastructure/repositories/messaging/api-conversation-query-repository";
import { ApiConversationCommandRepository } from "@/infrastructure/repositories/messaging/api-conversation-command-repository";
import { ApiJobRequestRepository } from "@/infrastructure/repositories/messaging/api-job-request-repository";
import { ApiServiceProposalRepository } from "@/infrastructure/repositories/messaging/api-service-proposal-repository";
import {
  getConversationDetail as getConvDetailUseCase,
  getJobRequestForConversation as getJobReqUseCase,
} from "@/application/messaging/get-conversation-detail";
import {
  createConversation as createConvUseCase,
  sendMessage as sendMsgUseCase,
} from "@/application/messaging/send-message";
import { sendServiceProposal as sendServiceProposalUseCase } from "@/application/messaging/send-service-proposal";
import { getServiceProposals } from "@/application/messaging/get-service-proposals";
import { acceptWorkRequest } from "@/application/provider/accept-work-request";
import {
  ConversationDetailInfo,
  CreateServiceProposalInput,
  Message,
  ServiceProposal,
  ServiceProposalSummary,
} from "@/domain/messaging/types";
import {
  CreateConversationCommand,
  CreatedConversation,
  SendConversationAudioCommand,
  SendConversationMessageCommand,
} from "@/ports/messaging/conversation-command-repository";
import { JobRequestSummary } from "@/ports/messaging/job-request-repository";
import { logger } from "@/infrastructure/logging/logger";

export async function getConversationDetail(id: string): Promise<ConversationDetailInfo> {
  const repository = new ApiConversationQueryRepository();
  return getConvDetailUseCase(repository, id);
}

export async function createConversation(command: CreateConversationCommand): Promise<CreatedConversation> {
  const repository = new ApiConversationCommandRepository();
  return createConvUseCase(repository, command);
}

export async function sendMessage(command: SendConversationMessageCommand): Promise<Message> {
  const repository = new ApiConversationCommandRepository();
  return sendMsgUseCase(repository, command);
}

export async function sendAudioMessage(command: SendConversationAudioCommand): Promise<Message> {
  const repository = new ApiConversationCommandRepository();
  return repository.sendAudioMessage(command);
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
    logger.debug("[actions] createServiceProposal error:", { error });
    const message = error instanceof Error ? error.message : "Error";
    return { success: false, error: message };
  }
}

export async function getServiceProposalsAction(): Promise<ServiceProposalSummary[]> {
  const repository = new ApiServiceProposalRepository();
  return getServiceProposals(repository);
}
