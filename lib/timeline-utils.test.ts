import { describe, expect, it } from "vitest";
import type { Message, ServiceProposalSummary } from "@/domain/messaging/types";
import { buildChatTimeline, type ChatTimelineItem } from "./timeline-utils";

const createMockMessage = (id: string, sentAt: string, content = "Hola"): Message => ({
  id,
  content,
  sentAt,
  senderId: "1",
});

const createMockProposal = (
  id: number,
  createdOn: string,
  status: "pending" | "accepted" | "rejected" = "pending",
): ServiceProposalSummary => ({
  id,
  conversationId: 10,
  amountCents: 3000000,
  scheduledOn: "2026-09-01T15:00:00Z",
  description: "Reparación de cocina",
  status,
  createdOn,
  counterpart: {
    id: 2,
    role: "provider",
    name: "Juan",
    surname: "Pérez",
  },
});

describe("buildChatTimeline", () => {
  it("should return empty array when both messages and proposals are empty", () => {
    const result = buildChatTimeline([], []);
    expect(result).toEqual([]);
  });

  it("should return only messages sorted by timestamp when no proposals are provided", () => {
    const msg1 = createMockMessage("1", "2026-08-18T10:00:00Z");
    const msg2 = createMockMessage("2", "2026-08-18T10:05:00Z");

    const result = buildChatTimeline([msg2, msg1], []);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual<ChatTimelineItem>({
      type: "message",
      id: "msg-1",
      timestamp: "2026-08-18T10:00:00Z",
      data: msg1,
    });
    expect(result[1]).toEqual<ChatTimelineItem>({
      type: "message",
      id: "msg-2",
      timestamp: "2026-08-18T10:05:00Z",
      data: msg2,
    });
  });

  it("should return only proposals when no messages are provided", () => {
    const prop1 = createMockProposal(1, "2026-08-18T10:00:00Z");

    const result = buildChatTimeline([], [prop1]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<ChatTimelineItem>({
      type: "proposal",
      id: "prop-1",
      timestamp: "2026-08-18T10:00:00Z",
      data: prop1,
    });
  });

  it("should interleave messages and proposals in chronological order", () => {
    const msg1 = createMockMessage("1", "2026-08-18T10:00:00Z", "Primer mensaje");
    const prop1 = createMockProposal(1, "2026-08-18T10:10:00Z");
    const msg2 = createMockMessage("2", "2026-08-18T10:20:00Z", "Mensaje posterior");

    const result = buildChatTimeline([msg2, msg1], [prop1]);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("msg-1");
    expect(result[0].type).toBe("message");
    expect(result[1].id).toBe("prop-1");
    expect(result[1].type).toBe("proposal");
    expect(result[2].id).toBe("msg-2");
    expect(result[2].type).toBe("message");
  });

  it("should handle multiple proposals across a conversation", () => {
    const msg1 = createMockMessage("1", "2026-08-18T10:00:00Z");
    const prop1 = createMockProposal(1, "2026-08-18T10:05:00Z", "rejected");
    const msg2 = createMockMessage("2", "2026-08-18T10:10:00Z", "¿Podés ajustar el precio?");
    const prop2 = createMockProposal(2, "2026-08-18T10:15:00Z", "pending");

    const result = buildChatTimeline([msg1, msg2], [prop2, prop1]);

    expect(result.map((item) => item.id)).toEqual(["msg-1", "prop-1", "msg-2", "prop-2"]);
  });

  it("should sort correctly using createdOn ISO when sentAt is localized string", () => {
    const prop = createMockProposal(1, "2026-08-18T14:40:00Z"); // 14:40
    const msg = {
      id: "10",
      content: "hola",
      sentAt: "02:50 p. m.", // localized string
      createdOn: "2026-08-18T14:50:00Z", // 14:50 (after proposal)
    };

    const result = buildChatTimeline([msg], [prop]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("prop-1");
    expect(result[1].id).toBe("msg-10");
  });
});
