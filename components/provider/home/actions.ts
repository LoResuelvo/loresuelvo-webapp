"use server";

import { acceptWorkRequest } from "@/lib/provider-home/api-provider-home-repository";

export async function acceptJobRequest(requestId: string): Promise<void> {
  await acceptWorkRequest(requestId);
}

export async function rejectJobRequest(requestId: string): Promise<void> {
  console.log("[DEBUG] Reject request:", requestId);
}