export interface ProviderWorkRequest {
  id: string;
  clientName: string;
  problemTitle: string;
  summary: string;
  location: string;
  publishedAtLabel: string;
}

export interface ProviderHomeDashboard {
  workRequests: ProviderWorkRequest[];
}

export interface ProviderHomeRepository {
  getDashboard(providerId: string): Promise<ProviderHomeDashboard>;
}
