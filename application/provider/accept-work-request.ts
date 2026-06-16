import { JobRequestRepository } from "@/ports/job-request-repository";

export async function acceptWorkRequest(
  jobRequestRepository: JobRequestRepository,
  requestId: number
): Promise<void> {
  return jobRequestRepository.accept(requestId);
}
