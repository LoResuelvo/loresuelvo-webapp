import type { RecommendedProvider, ProblemAssessment } from "@/domain/messaging/types";

export interface AiMessage {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
  recommendedProviders?: RecommendedProvider[];
  diagnosisCompleted?: boolean;
  assessment?: ProblemAssessment;
  images?: { id: string; url: string; originalName: string }[];
}
