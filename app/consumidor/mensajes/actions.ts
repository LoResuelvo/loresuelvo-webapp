"use server";

import { ApiServiceProposalRepository } from "@/infrastructure/repositories/messaging/api-service-proposal-repository";
import { ApiConversationQueryRepository } from "@/infrastructure/repositories/messaging/api-conversation-query-repository";
import { ApiConversationCommandRepository } from "@/infrastructure/repositories/messaging/api-conversation-command-repository";
import { ApiJobRequestRepository } from "@/infrastructure/repositories/messaging/api-job-request-repository";
import { getServiceProposals } from "@/application/messaging/get-service-proposals";
import {
  getConversationDetail as getConvDetailUseCase,
  getJobRequestForConversation as getJobReqUseCase,
} from "@/application/messaging/get-conversation-detail";
import {
  createConversation as createConvUseCase,
  sendMessage as sendMsgUseCase,
} from "@/application/messaging/send-message";
import {
  CreateConversationCommand,
  CreatedConversation,
  SendConversationAudioCommand,
  SendConversationMessageCommand,
  SendConversationVideoCommand,
} from "@/ports/messaging/conversation-command-repository";
import { ConversationDetailInfo, Message, ServiceProposalSummary } from "@/domain/messaging/types";
import { JobRequestSummary } from "@/ports/messaging/job-request-repository";

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

export type SendVideoMessageActionResult =
  | { success: true; data: Message }
  | { success: false; error: string; status?: number };

export async function sendVideoMessage(
  command: SendConversationVideoCommand
): Promise<Message | SendVideoMessageActionResult> {
  try {
    const repository = new ApiConversationCommandRepository();
    const message = await repository.sendVideoMessage(command);
    return { success: true, data: message };
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; statusCode?: number };
    const message = err?.message || "Error al enviar mensaje con video";
    const status = err?.status || err?.statusCode;
    return { success: false, error: message, status };
  }
}

export async function getJobRequestForConversation(conversationId: string): Promise<JobRequestSummary | null> {
  const repository = new ApiJobRequestRepository();
  return getJobReqUseCase(repository, conversationId);
}

export async function getServiceProposalsAction(): Promise<ServiceProposalSummary[]> {
  const repository = new ApiServiceProposalRepository();
  return getServiceProposals(repository);
}
