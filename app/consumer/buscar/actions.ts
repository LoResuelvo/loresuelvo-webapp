"use server";

import { jobRequestsClient, type JobRequestResponse } from "@/lib/job-requests-client";

export async function createJobRequest(
  providerId: number,
  title: string,
  description: string
): Promise<JobRequestResponse> {
  return jobRequestsClient.createJobRequest({
    provider_id: providerId,
    title,
    description,
  });
}
