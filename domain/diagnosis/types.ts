import type { RecommendedProvider } from "@/domain/messaging/types";

export interface AiMessage {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
  recommendedProviders?: RecommendedProvider[];
  diagnosisCompleted?: boolean;
  images?: { id: string; url: string; originalName: string }[];
}
