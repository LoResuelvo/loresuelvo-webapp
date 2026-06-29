import { describe, expect, it, vi } from "vitest";
import { createAiJobRequest } from "./create-ai-job-request";
import { AiChatRepository } from "@/ports/ai-chat-repository";

describe("createAiJobRequest", () => {
  const mockAiChatRepository = {
    createJobRequest: vi.fn(),
  } as unknown as AiChatRepository;

  it("creates an AI job request and returns the result", async () => {
    const expectedResult = {
      id: 123,
      conversationId: 456,
      title: "Plomería de emergencia",
      description: "Pérdida en baño principal",
    };
    vi.mocked(mockAiChatRepository.createJobRequest).mockResolvedValue(expectedResult);

    const res = await createAiJobRequest(mockAiChatRepository, "conv-456", 101);
    expect(res).toEqual(expectedResult);
    expect(mockAiChatRepository.createJobRequest).toHaveBeenCalledWith("conv-456", 101);
  });

  it("propagates 409 conflict error", async () => {
    const error = new Error("Conflict: ya existe una solicitud abierta");
    vi.mocked(mockAiChatRepository.createJobRequest).mockRejectedValue(error);

    await expect(createAiJobRequest(mockAiChatRepository, "conv-456", 101)).rejects.toThrow(
      "Conflict: ya existe una solicitud abierta"
    );
  });

  it("propagates 500 server error", async () => {
    const error = new Error("Internal Server Error");
    vi.mocked(mockAiChatRepository.createJobRequest).mockRejectedValue(error);

    await expect(createAiJobRequest(mockAiChatRepository, "conv-456", 101)).rejects.toThrow(
      "Internal Server Error"
    );
  });
});
