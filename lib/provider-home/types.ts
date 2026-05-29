export interface ProviderWorkRequest {
  id: string;
  clientName: string;
  problemTitle: string;
  summary: string;
  location: string;
  publishedAtLabel: string;
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
