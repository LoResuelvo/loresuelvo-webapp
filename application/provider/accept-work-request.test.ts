import { describe, expect, it, vi } from "vitest";
import { acceptWorkRequest } from "./accept-work-request";
import { JobRequestRepository } from "@/ports/job-request-repository";

describe("acceptWorkRequest", () => {
  const mockJobRequestRepository = {
    accept: vi.fn(),
  } as unknown as JobRequestRepository;

  it("calls the accept method of the repository with the specified ID", async () => {
    vi.mocked(mockJobRequestRepository.accept).mockResolvedValue(undefined);

    await acceptWorkRequest(mockJobRequestRepository, 42);
    expect(mockJobRequestRepository.accept).toHaveBeenCalledWith(42);
  });
});
