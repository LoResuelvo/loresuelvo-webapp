"use server";

import { jobRequestsClient, type JobRequestResponse } from "@/lib/job-requests-client";
import { ApiClientError } from "@/lib/api/base-client";

export type CreateJobRequestResult =
  | { success: true; data: JobRequestResponse }
  | { success: false; error: string };

export async function createJobRequest(
  providerId: number,
  title: string,
  description: string
): Promise<CreateJobRequestResult> {
  try {
    const data = await jobRequestsClient.createJobRequest({
      provider_id: providerId,
      title,
      description,
    });
    return { success: true, data };
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error de conexión o inesperado." };
  }
}
