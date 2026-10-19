import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConversationDetailInfo, ServiceProposalSummary } from "@/domain/messaging/types";
import { useConversationRelatedData } from "./useConversationRelatedData";

vi.mock("@/infrastructure/notifications/NotificationContext", () => ({
  useResourceUpdate: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function conversation(id: number, counterpartId: number): ConversationDetailInfo {
  return {
    id,
    status: "accepted",
    counterpart: {
      id: counterpartId,
      role: "provider",
      name: `Contact ${counterpartId}`,
      surname: "Test",
      categoryName: "Plomería",
    },
    messages: [],
    updatedOn: "2026-10-18T12:00:00Z",
  };
}

function proposal(conversationId: number, description: string): ServiceProposalSummary {
  return {
    id: conversationId,
    conversationId,
    amountCents: 1500000,
    scheduledOn: "2026-10-20T12:00:00Z",
    description,
    estimatedDurationMinutes: 60,
    status: "pending",
    createdOn: "2026-10-18T12:00:00Z",
    counterpart: { id: 10, role: "provider", name: "Alex", surname: "Test" },
  };
}

describe("useConversationRelatedData", () => {
  it("ignores related data responses from the previously selected contact", async () => {
    const firstJobRequest = deferred<{ title: string } | null>();
    const secondJobRequest = deferred<{ title: string } | null>();
    const firstProposals = deferred<ServiceProposalSummary[]>();
    const secondProposals = deferred<ServiceProposalSummary[]>();
    const getJobRequest = vi.fn()
      .mockReturnValueOnce(firstJobRequest.promise)
      .mockReturnValueOnce(secondJobRequest.promise);
    const getServiceProposals = vi.fn()
      .mockReturnValueOnce(firstProposals.promise)
      .mockReturnValueOnce(secondProposals.promise);
    let selectedCounterpartId = "10";

    const { result, rerender } = renderHook(() => useConversationRelatedData<{ title: string }, string>({
      selectedCounterpartId,
      getJobRequest,
      getServiceProposals,
      mapJobRequest: (request, detail) => `${request.title} for ${detail.counterpart.id}`,
    }));

    act(() => result.current.onConversationLoaded("100", conversation(100, 10)));
    selectedCounterpartId = "20";
    rerender();
    act(() => result.current.onConversationLoaded("200", conversation(200, 20)));

    await act(async () => {
      secondJobRequest.resolve({ title: "Request B" });
      secondProposals.resolve([proposal(200, "Proposal B")]);
      await Promise.all([secondJobRequest.promise, secondProposals.promise]);
    });
    expect(result.current.activeJobRequest).toBe("Request B for 20");
    expect(result.current.activeServiceProposal?.description).toBe("Proposal B");

    await act(async () => {
      firstJobRequest.resolve({ title: "Request A" });
      firstProposals.resolve([proposal(100, "Proposal A")]);
      await Promise.all([firstJobRequest.promise, firstProposals.promise]);
    });
    expect(result.current.activeJobRequest).toBe("Request B for 20");
    expect(result.current.activeServiceProposal?.description).toBe("Proposal B");
  });

  it("exposes failed related-data loads and retries the selected conversation", async () => {
    const getJobRequest = vi.fn().mockResolvedValue(null);
    const getServiceProposals = vi.fn()
      .mockRejectedValueOnce(new Error("Network failed"))
      .mockResolvedValueOnce([proposal(100, "Recovered proposal")]);
    const { result } = renderHook(() => useConversationRelatedData({
      selectedCounterpartId: "10",
      getJobRequest,
      getServiceProposals,
      mapJobRequest: (request: { title: string }) => request.title,
    }));

    act(() => result.current.onConversationLoaded("100", conversation(100, 10)));
    await waitFor(() => expect(result.current.relatedDataError).toBe(true));

    act(() => result.current.retryRelatedData());
    await waitFor(() => {
      expect(result.current.relatedDataError).toBe(false);
      expect(result.current.activeServiceProposal?.description).toBe("Recovered proposal");
    });
    expect(getServiceProposals).toHaveBeenCalledTimes(2);
  });

  it("does not map a pending request after the hook unmounts", async () => {
    const jobRequest = deferred<{ title: string } | null>();
    const proposals = deferred<ServiceProposalSummary[]>();
    const mapJobRequest = vi.fn((request: { title: string }) => request.title);
    const { result, unmount } = renderHook(() => useConversationRelatedData({
      selectedCounterpartId: "10",
      getJobRequest: () => jobRequest.promise,
      getServiceProposals: () => proposals.promise,
      mapJobRequest,
    }));

    act(() => result.current.onConversationLoaded("100", conversation(100, 10)));
    unmount();
    await act(async () => {
      jobRequest.resolve({ title: "Late request" });
      proposals.resolve([proposal(100, "Late proposal")]);
      await Promise.all([jobRequest.promise, proposals.promise]);
    });

    expect(mapJobRequest).not.toHaveBeenCalled();
  });
});
