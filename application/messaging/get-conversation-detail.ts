import { ConversationRepository } from "@/ports/messaging/conversation-repository";
import { JobRequestRepository, JobRequestSummary } from "@/ports/messaging/job-request-repository";
import { ConversationDetailInfo } from "@/domain/messaging/types";

export async function getConversationDetail(
  conversationRepository: ConversationRepository,
  id: string
): Promise<ConversationDetailInfo> {
  return conversationRepository.getById(id);
}

export async function getJobRequestForConversation(
  jobRequestRepository: JobRequestRepository,
  conversationId: string
): Promise<JobRequestSummary | null> {
  const jobRequests = await jobRequestRepository.list();
  return jobRequests.find(jr => String(jr.conversationId) === conversationId) ?? null;
}
