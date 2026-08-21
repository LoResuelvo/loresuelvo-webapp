import type { AiConversationDetail, ProblemAssessment, RecommendedProvider } from "../messaging/types";

function isDiagnosisCompleted(
  session: Pick<AiConversationDetail, "diagnosisCompleted">,
): boolean {
  return Boolean(session.diagnosisCompleted);
}

function requiresProfessional(
  session: { assessment?: ProblemAssessment },
): boolean {
  return session.assessment?.outcome === "professional_required";
}

function isSelfService(
  session: { assessment?: ProblemAssessment },
): boolean {
  return session.assessment?.outcome === "self_service";
}

function isCollectingInformation(
  session: { assessment?: ProblemAssessment },
): boolean {
  return session.assessment?.outcome === "collecting_information";
}

function hasRecommendedProviders(
  session: { recommendedProviders?: RecommendedProvider[] },
): boolean {
  return Array.isArray(session.recommendedProviders) && session.recommendedProviders.length > 0;
}

export const DiagnosisSessionModule = {
  isDiagnosisCompleted,
  requiresProfessional,
  isSelfService,
  isCollectingInformation,
  hasRecommendedProviders,
};

export const DiagnosisSession = DiagnosisSessionModule;
