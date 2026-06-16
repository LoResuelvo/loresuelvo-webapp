import { ProviderHomeDashboard } from "@/domain/provider/types";

export interface ProviderHomeRepository {
  getDashboard(providerId: string): Promise<ProviderHomeDashboard>;
}
