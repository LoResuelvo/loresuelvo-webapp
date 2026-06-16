import { ConversationRepository } from "@/ports/conversation-repository";
import { JobRequestRepository, JobRequestSummary } from "@/ports/job-request-repository";
import { ConversationDetail } from "@/domain/messaging/types";

export async function getConversationDetail(
  conversationRepository: ConversationRepository,
  id: string
): Promise<ConversationDetail> {
  return conversationRepository.getById(id);
}

export async function getJobRequestForConversation(
  jobRequestRepository: JobRequestRepository,
  conversationId: string
): Promise<JobRequestSummary | null> {
  try {
    const jobRequests = await jobRequestRepository.list();
    return jobRequests.find(jr => String(jr.conversation_id) === conversationId) ?? null;
  } catch (error) {
    console.error("Error fetching job request for conversation in use case:", error);
    return null;
  }
}
