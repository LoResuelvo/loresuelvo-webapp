import { JobRequestRepository, CreateJobRequestInput, JobRequestResult } from "@/ports/job-request-repository";

export type CreateWorkRequestResult =
  | { success: true; data: JobRequestResult }
  | { success: false; errorCode: "VALIDATION_ERROR" | "DUPLICATE" | "ROLE_ERROR" | "UNAVAILABLE" | "MISSING_FIELDS" | "GENERIC_ERROR"; message: string };

export async function createWorkRequest(
  jobRequestRepository: JobRequestRepository,
  providerId: number,
  title: string,
  description: string,
  imageFileIds?: string[]
): Promise<CreateWorkRequestResult> {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (!trimmedTitle || !trimmedDescription) {
    return { success: false, errorCode: "VALIDATION_ERROR", message: "Title and description are required." };
  }

  try {
    const payload: CreateJobRequestInput = {
      providerId: providerId,
      title: trimmedTitle,
      description: trimmedDescription,
      imageFileIds,
    };
    const data = await jobRequestRepository.create(payload);
    return { success: true, data };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Job request already exists") || errorMessage.includes("Conversation already exists")) {
      return { success: false, errorCode: "DUPLICATE", message: errorMessage };
    }
    if (errorMessage.includes("Only consumers can create job requests")) {
      return { success: false, errorCode: "ROLE_ERROR", message: errorMessage };
    }
    if (errorMessage.includes("Provider does not exist")) {
      return { success: false, errorCode: "UNAVAILABLE", message: errorMessage };
    }
    if (errorMessage.includes("Title is required") || errorMessage.includes("Provider id is required")) {
      return { success: false, errorCode: "MISSING_FIELDS", message: errorMessage };
    }
    return { success: false, errorCode: "GENERIC_ERROR", message: errorMessage };
  }
}
