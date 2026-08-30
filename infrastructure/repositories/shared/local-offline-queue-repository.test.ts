import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalOfflineQueueRepository } from "./local-offline-queue-repository";
import { Message } from "@/domain/messaging/types";

describe("LocalOfflineQueueRepository", () => {
  let repo: LocalOfflineQueueRepository;

  beforeEach(() => {
    repo = new LocalOfflineQueueRepository();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should save and load pending messages successfully", () => {
    const conversationId = "123";
    const messages: Message[] = [
      { id: "pending-1", content: "Test 1", sentAt: "Ahora" },
      { id: "pending-2", content: "Test 2", sentAt: "Ahora" },
    ];

    repo.savePendingMessages(conversationId, messages);
    const loaded = repo.loadPendingMessages(conversationId);

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("pending-1");
    expect(loaded[0].content).toBe("Test 1");
    expect(loaded[1].id).toBe("pending-2");
    expect(loaded[1].content).toBe("Test 2");
  });

  it("should return empty array if no pending messages exist", () => {
    const loaded = repo.loadPendingMessages("non-existent");
    expect(loaded).toEqual([]);
  });

  it("should clear pending messages successfully", () => {
    const conversationId = "123";
    const messages: Message[] = [{ id: "pending-1", content: "Test 1", sentAt: "Ahora" }];

    repo.savePendingMessages(conversationId, messages);
    expect(repo.loadPendingMessages(conversationId)).toHaveLength(1);

    repo.clearPendingMessages(conversationId);
    expect(repo.loadPendingMessages(conversationId)).toEqual([]);
  });

  it("should handle localStorage errors gracefully when saving", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const conversationId = "123";
    const messages: Message[] = [{ id: "pending-1", content: "Test 1", sentAt: "Ahora" }];

    expect(() => repo.savePendingMessages(conversationId, messages)).not.toThrow();
    setItemSpy.mockRestore();
  });

  it("should handle localStorage errors gracefully when loading", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(repo.loadPendingMessages("123")).toEqual([]);
    getItemSpy.mockRestore();
  });
});
