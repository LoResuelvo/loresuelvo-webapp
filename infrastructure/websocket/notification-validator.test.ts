import { describe, it, expect } from "vitest";
import { validateWsEvent } from "./notification-validator";

describe("validateWsEvent", () => {
  it("validates valid conversation.message.created event", () => {
    const raw = {
      type: "conversation.message.created",
      conversation_id: 12,
      message: {
        id: 42,
        sender_role: "consumer",
        content: "Hola",
        created_on: "2026-10-15T10:00:00Z",
      },
    };

    const result = validateWsEvent(raw);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("conversation.message.created");
  });

  it("validates valid notification.created event without job_request", () => {
    const raw = {
      type: "notification.created",
      notification: {
        id: 101,
        user_id: 5,
        type: "work_order_close_to_scheduled_time",
        resource_type: "work_order",
        resource_id: 200,
        created_at: "2026-10-15T12:00:00Z",
      },
    };

    const result = validateWsEvent(raw);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("notification.created");
  });

  it("validates notification.created event with id 0 (e.g. calendar reauthorization)", () => {
    const raw = {
      type: "notification.created",
      notification: {
        id: 0,
        user_id: 5,
        type: "calendar_reauthorization_required",
        resource_type: "calendar_connection",
        resource_id: 5,
        created_at: "2026-10-15T12:00:00Z",
      },
    };

    const result = validateWsEvent(raw);
    expect(result).not.toBeNull();
    if (result && result.type === "notification.created") {
      expect(result.notification.id).toBe(0);
      expect(result.notification.type).toBe("calendar_reauthorization_required");
    }
  });

  it("validates notification.created with job_request payload", () => {
    const raw = {
      type: "notification.created",
      notification: {
        id: 1,
        user_id: 10,
        type: "job_request_received",
        resource_type: "job_request",
        resource_id: 77,
        created_at: "2026-10-15T12:00:00Z",
      },
      job_request: {
        id: 77,
        conversation_id: 88,
        title: "Arreglar canilla",
        description: "Pierde agua en la cocina",
        status: "pending",
        requester: {
          name: "Carlos",
          surname: "García",
        },
        images: [{ id: 1, original_name: "canilla.png", url: "https://example.com/canilla.png" }],
      },
    };

    const result = validateWsEvent(raw);
    expect(result).not.toBeNull();
    if (result && result.type === "notification.created") {
      expect(result.job_request?.title).toBe("Arreglar canilla");
    }
  });

  it("rejects null or non-object values", () => {
    expect(validateWsEvent(null)).toBeNull();
    expect(validateWsEvent(undefined)).toBeNull();
    expect(validateWsEvent("string")).toBeNull();
    expect(validateWsEvent(123)).toBeNull();
  });

  it("rejects unknown event type", () => {
    const raw = {
      type: "unknown.event.type",
      data: { some: "data" },
    };
    expect(validateWsEvent(raw)).toBeNull();
  });

  it("rejects malformed notification.created (missing resource_id)", () => {
    const raw = {
      type: "notification.created",
      notification: {
        id: 1,
        user_id: 10,
        type: "job_request_received",
        resource_type: "job_request",
        created_at: "2026-10-15T12:00:00Z",
      },
    };
    expect(validateWsEvent(raw)).toBeNull();
  });

  it("rejects malformed job_request in notification.created", () => {
    const raw = {
      type: "notification.created",
      notification: {
        id: 1,
        user_id: 10,
        type: "job_request_received",
        resource_type: "job_request",
        resource_id: 77,
        created_at: "2026-10-15T12:00:00Z",
      },
      job_request: {
        id: "not-a-number",
      },
    };
    expect(validateWsEvent(raw)).toBeNull();
  });
});
