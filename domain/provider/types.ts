import { MessageImage } from "../messaging/types";

export interface Provider {
  id: number;
  name: string;
  surname: string;
  categoryName: string;
  categoryId?: number;
  description?: string;
  rating?: number;
  reviews?: number;
  jobs?: number;
  profilePhotoUrl?: string;
}

export interface ProviderWorkRequest {
  id: string;
  conversationId: string;
  clientName: string;
  problemTitle: string;
  category: string;
  description: string;
  location: string;
  publishedAtLabel: string;
  unreadMessagesCount: number;
  images?: MessageImage[];
}

export interface ProviderScheduledJob {
  id: string;
  jobTitle: string;
  clientName: string;
  scheduledAtLabel: string;
  location: string;
  priceLabel: string;
}

export interface ProviderMetrics {
  incomeLabel: string;
  jobsCompletedCount: number;
  ratingLabel: string;
}

export interface ProviderHomeDashboard {
  workRequests: ProviderWorkRequest[];
  scheduledJobs: ProviderScheduledJob[];
  metrics: ProviderMetrics;
}
