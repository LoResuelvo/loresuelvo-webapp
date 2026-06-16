import { describe, expect, it, vi } from "vitest";
import { rejectWorkRequest } from "./reject-work-request";

describe("rejectWorkRequest", () => {
  it("runs rejectWorkRequest successfully (logging the action)", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await rejectWorkRequest(42);
    expect(consoleSpy).toHaveBeenCalledWith("[DEBUG] Reject request in use case:", 42);
    consoleSpy.mockRestore();
  });
});
