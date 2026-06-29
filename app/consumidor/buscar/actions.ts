"use server";

import { ApiJobRequestRepository } from "@/infrastructure/repositories/api-job-request-repository";
import { createWorkRequest } from "@/application/consumer/create-work-request";
import { JobRequestResult } from "@/ports/job-request-repository";

export type CreateJobRequestResult =
  | { success: true; data: JobRequestResult }
  | { success: false; error: string };

export async function createJobRequest(
  providerId: number,
  title: string,
  description: string,
  imageFileIds?: string[]
): Promise<CreateJobRequestResult> {
  const repository = new ApiJobRequestRepository();
  const result = await createWorkRequest(repository, providerId, title, description, imageFileIds);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.message };
  }
}
