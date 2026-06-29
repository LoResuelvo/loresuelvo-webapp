import type { ApiAiConversation, ApiAiConversationDetail, ApiAiConversationMessage, ApiRecommendedProvider } from "@/infrastructure/api/types";
import type { AiConversationContact, AiConversationDetail, AiMessage, RecommendedProvider, AssessmentOutcome } from "@/domain/messaging/types";

export function mapApiToAiConversationContact(api: ApiAiConversation): AiConversationContact {
  const dateString = api.last_message?.created_on ?? api.updated_on;
  return {
    id: String(api.id),
    title: api.title,
    lastMessage: api.last_message?.content ?? "",
    lastMessageAt: dateString
      ? new Date(dateString).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  };
}

export function mapApiToAiMessage(api: ApiAiConversationMessage): AiMessage {
  return {
    id: String(api.id),
    senderRole: api.sender_role as "consumer" | "chatbot",
    content: api.content,
    sentAt: api.created_on,
    images: api.images?.map((img) => ({
      id: img.id,
      url: img.url,
      originalName: img.original_name,
    })),
  };
}

export function mapApiToRecommendedProvider(api: ApiRecommendedProvider): RecommendedProvider {
  return {
    id: api.id,
    name: api.name,
    surname: api.surname,
    categoryName: api.category_name,
    profilePhotoUrl: api.profile_photo_url,
  };
}

export function mapApiToAiConversationDetail(api: ApiAiConversationDetail): AiConversationDetail {
  const providers = api.recommended_providers ?? api.chatbot?.recommended_providers ?? [];
  const title = api.title ?? api.chatbot?.title ?? "";
  const responseStatus = api.response_status ?? api.chatbot?.response_status ?? "";
  const diagnosisCompleted = api.diagnosis_completed ?? api.chatbot?.diagnosis_completed ?? false;
  const recommendedCategory = api.recommended_category ?? api.chatbot?.recommended_category;

  const apiAssessment = api.assessment ?? api.chatbot?.assessment;
  const assessment = apiAssessment
    ? {
        outcome: apiAssessment.outcome as AssessmentOutcome,
        problemCategory: apiAssessment.problem_category
          ? {
              id: apiAssessment.problem_category.id,
              name: apiAssessment.problem_category.name,
            }
          : undefined,
      }
    : undefined;

  return {
    id: api.id,
    status: api.status,
    title: title,
    responseStatus: responseStatus,
    diagnosisCompleted: diagnosisCompleted,
    assessment: assessment,
    recommendedCategory: recommendedCategory,
    messages: api.messages.map(mapApiToAiMessage),
    recommendedProviders: providers.map(mapApiToRecommendedProvider),
    updatedOn: api.messages.length > 0
      ? api.messages[api.messages.length - 1].created_on
      : new Date().toISOString(),
  };
}
