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

export interface ProviderHomeRepository {
  getDashboard(providerId: string): Promise<ProviderHomeDashboard>;
}
