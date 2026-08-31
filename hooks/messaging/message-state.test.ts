import { describe, expect, it } from "vitest";
import type { Message } from "@/domain/messaging/types";
import {
  appendMessageIfMissing,
  combineVisibleMessages,
  mergeConversationMessages,
  toggleExpandedMessage,
  updateContactPreview,
} from "./message-state";

const message = (id: string, content?: string): Message => ({
  id,
  content,
  senderId: "user-1",
  sentAt: "Ahora",
});

describe("message state transitions", () => {
  it("combines remote, pending, and previously received messages without duplicates", () => {
    const result = mergeConversationMessages(
      [message("1", "remote")],
      [message("pending-1", "pending"), message("duplicate-content", "remote")],
      [message("2", "realtime"), message("1", "remote")]
    );

    expect(result.map((current) => current.id)).toEqual(["1", "pending-1", "2"]);
  });

  it("does not append a realtime message twice", () => {
    expect(appendMessageIfMissing([message("1")], message("1"))).toHaveLength(1);
  });

  it("keeps local optimistic messages visible only when they are not loaded", () => {
    expect(combineVisibleMessages([message("1")], [message("1"), message("local")]).map((current) => current.id)).toEqual([
      "1",
      "local",
    ]);
  });

  it("updates a preview for both active and inactive contacts", () => {
    const contacts = [
      { id: "conv-1", counterpartId: "100", lastMessage: "old" },
      { id: "conv-2", counterpartId: "200", lastMessage: "old" },
    ];

    const updated = updateContactPreview(contacts, "200", "new", "Ahora", (contact) => contact.counterpartId);

    expect(updated[0].lastMessage).toBe("old");
    expect(updated[1]).toMatchObject({ lastMessage: "new", lastMessageAt: "Ahora" });
  });

  it("toggles message expansion without mutating the current set", () => {
    const original = new Set(["first"]);
    const collapsed = toggleExpandedMessage(original, "first");
    const expanded = toggleExpandedMessage(collapsed, "second");

    expect(original.has("first")).toBe(true);
    expect([...collapsed]).toEqual([]);
    expect([...expanded]).toEqual(["second"]);
  });
});
