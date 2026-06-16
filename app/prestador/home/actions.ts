"use server";

import { ApiJobRequestRepository } from "@/infrastructure/repositories/api-job-request-repository";
import { acceptWorkRequest } from "@/application/provider/accept-work-request";
import { rejectWorkRequest } from "@/application/provider/reject-work-request";

export async function acceptJobRequest(requestId: string): Promise<void> {
  const repository = new ApiJobRequestRepository();
  return acceptWorkRequest(repository, parseInt(requestId, 10));
}

export async function rejectJobRequest(requestId: string): Promise<void> {
  return rejectWorkRequest(parseInt(requestId, 10));
}
