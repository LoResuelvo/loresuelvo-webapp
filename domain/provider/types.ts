export interface Provider {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  category_id?: number;
  description?: string;
  rating?: number;
  reviews?: number;
  jobs?: number;
  profile_photo_url?: string;
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
