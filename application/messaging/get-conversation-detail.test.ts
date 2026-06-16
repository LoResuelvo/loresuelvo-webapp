import { describe, expect, it, vi } from "vitest";
import { getConversationDetail, getJobRequestForConversation } from "./get-conversation-detail";
import { ConversationRepository } from "@/ports/conversation-repository";
import { JobRequestRepository, JobRequestSummary } from "@/ports/job-request-repository";
import { ConversationDetail } from "@/domain/messaging/types";

describe("get-conversation-detail", () => {
  const mockConversationDetail: ConversationDetail = {
    id: 123,
    status: "active",
    counterpart: { id: 1, role: "provider", name: "A", surname: "B", category_name: "X" },
    messages: [],
    updated_on: "2026-06-16T12:00:00Z",
  };

  const mockJobRequests: JobRequestSummary[] = [
    {
      id: 1,
      conversation_id: 123,
      title: "Title",
      description: "Desc",
      requester: {
        name: "John",
        surname: "Doe",
      },
    },
  ];

  const mockConversationRepository = {
    getById: vi.fn(),
  } as unknown as ConversationRepository;

  const mockJobRequestRepository = {
    list: vi.fn(),
  } as unknown as JobRequestRepository;

  describe("getConversationDetail", () => {
    it("gets the conversation detail by ID successfully", async () => {
      vi.mocked(mockConversationRepository.getById).mockResolvedValue(mockConversationDetail);

      const res = await getConversationDetail(mockConversationRepository, "123");
      expect(res).toEqual(mockConversationDetail);
      expect(mockConversationRepository.getById).toHaveBeenCalledWith("123");
    });
  });

  describe("getJobRequestForConversation", () => {
    it("finds the corresponding job request for the conversation successfully", async () => {
      vi.mocked(mockJobRequestRepository.list).mockResolvedValue(mockJobRequests);

      const res = await getJobRequestForConversation(mockJobRequestRepository, "123");
      expect(res).toEqual(mockJobRequests[0]);
    });

    it("returns null if no matching job request is found", async () => {
      vi.mocked(mockJobRequestRepository.list).mockResolvedValue(mockJobRequests);

      const res = await getJobRequestForConversation(mockJobRequestRepository, "999");
      expect(res).toBeNull();
    });

    it("returns null and logs the error when the repository fails", async () => {
      vi.mocked(mockJobRequestRepository.list).mockRejectedValue(new Error("Network error"));

      const res = await getJobRequestForConversation(mockJobRequestRepository, "123");
      expect(res).toBeNull();
    });
  });
});
