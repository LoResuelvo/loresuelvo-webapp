import { describe, expect, it, vi } from "vitest";
import { createWorkRequest } from "./create-work-request";
import { JobRequestRepository, JobRequestResult } from "@/ports/job-request-repository";

describe("createWorkRequest", () => {
  const mockJobRequestResponse: JobRequestResult = {
    id: 1,
    conversationId: 10,
    title: "Title",
    description: "Description",
    images: [],
  };

  const mockJobRequestRepository = {
    create: vi.fn(),
  } as unknown as JobRequestRepository;

  it("returns validation error if title or description is missing", async () => {
    const res = await createWorkRequest(mockJobRequestRepository, 1, "", "   ");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe("VALIDATION_ERROR");
    }
  });

  it("creates the work request successfully", async () => {
    vi.mocked(mockJobRequestRepository.create).mockResolvedValue(mockJobRequestResponse);

    const res = await createWorkRequest(mockJobRequestRepository, 12, "Gotera", "Filtra agua");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual(mockJobRequestResponse);
    }
    expect(mockJobRequestRepository.create).toHaveBeenCalledWith({
      providerId: 12,
      title: "Gotera",
      description: "Filtra agua",
      imageFileIds: undefined,
    });
  });

  it("creates the work request with image file ids successfully", async () => {
    const mockResponseWithImages: JobRequestResult = {
      ...mockJobRequestResponse,
      images: [
        { id: "img-123", url: "http://example.com/123.jpg", originalName: "leak.jpg" }
      ]
    };
    vi.mocked(mockJobRequestRepository.create).mockResolvedValue(mockResponseWithImages);

    const res = await createWorkRequest(mockJobRequestRepository, 12, "Gotera", "Filtra agua", ["img-123"]);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual(mockResponseWithImages);
    }
    expect(mockJobRequestRepository.create).toHaveBeenCalledWith({
      providerId: 12,
      title: "Gotera",
      description: "Filtra agua",
      imageFileIds: ["img-123"],
    });
  });

  it("maps to DUPLICATE error if the backend indicates it already exists", async () => {
    vi.mocked(mockJobRequestRepository.create).mockRejectedValue(new Error("Job request already exists"));

    const res = await createWorkRequest(mockJobRequestRepository, 12, "Gotera", "Filtra agua");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe("DUPLICATE");
    }
  });

  it("maps to ROLE_ERROR if the user role does not have permission", async () => {
    vi.mocked(mockJobRequestRepository.create).mockRejectedValue(new Error("Only consumers can create job requests"));

    const res = await createWorkRequest(mockJobRequestRepository, 12, "Gotera", "Filtra agua");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe("ROLE_ERROR");
    }
  });
});
