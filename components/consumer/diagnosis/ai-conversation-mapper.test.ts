import { describe, expect, it } from "vitest";
import {
  mapConversationDetailToVisibleMessages,
  USER_ID,
  ASSISTANT_ID,
} from "./ai-conversation-mapper";
import type { AiConversationDetail } from "@/domain/messaging/types";

describe("ai-conversation-mapper", () => {
  it("returns an empty array when conversation has no messages", () => {
    const detail: AiConversationDetail = {
      id: 1,
      status: "active",
      title: "Diagnóstico",
      responseStatus: "answered",
      diagnosisCompleted: false,
      messages: [],
      recommendedProviders: [],
      updatedOn: "2026-06-18T10:00:00Z",
    };

    expect(mapConversationDetailToVisibleMessages(detail)).toEqual([]);
  });

  it("maps consumer and assistant messages preserving images and formatting dates", () => {
    const detail: AiConversationDetail = {
      id: 1,
      status: "active",
      title: "Pérdida de agua",
      responseStatus: "answered",
      diagnosisCompleted: true,
      assessment: {
        outcome: "professional_required",
        problemCategory: { id: 10, name: "Plomería" },
      },
      recommendedProviders: [
        {
          id: 101,
          name: "Carlos",
          surname: "Pérez",
          categoryName: "Plomería",
        },
      ],
      updatedOn: "2026-06-18T10:00:02Z",
      messages: [
        {
          id: "m-1",
          senderRole: "consumer",
          content: "Tengo una fuga",
          sentAt: "2026-06-18T10:00:00Z",
          images: [
            {
              id: "img-1",
              url: "https://storage.test/img1.jpg",
              originalName: "fuga.jpg",
            },
          ],
        },
        {
          id: "m-2",
          senderRole: "chatbot",
          content: "Revisá el sifón",
          sentAt: "2026-06-18T10:00:01Z",
        },
      ],
    };

    const visible = mapConversationDetailToVisibleMessages(detail);

    expect(visible).toHaveLength(2);
    expect(visible[0]).toEqual({
      id: "m-1",
      content: "Tengo una fuga",
      senderId: USER_ID,
      sentAt: "18/06/2026",
      images: [
        {
          id: "img-1",
          url: "https://storage.test/img1.jpg",
          originalName: "fuga.jpg",
        },
      ],
      recommendedProviders: undefined,
      diagnosisCompleted: undefined,
      assessment: undefined,
    });
    expect(visible[1]).toEqual({
      id: "m-2",
      content: "Revisá el sifón",
      senderId: ASSISTANT_ID,
      sentAt: "18/06/2026",
      images: undefined,
      recommendedProviders: detail.recommendedProviders,
      diagnosisCompleted: true,
      assessment: detail.assessment,
    });
  });

  it("attaches recommendations and assessment only to the LAST chatbot message", () => {
    const detail: AiConversationDetail = {
      id: 2,
      status: "active",
      title: "Diagnóstico continuo",
      responseStatus: "answered",
      diagnosisCompleted: true,
      assessment: { outcome: "professional_required" },
      recommendedProviders: [
        { id: 201, name: "Ana", surname: "Gómez", categoryName: "Gas" },
      ],
      updatedOn: "2026-06-18T10:00:03Z",
      messages: [
        {
          id: "m-1",
          senderRole: "chatbot",
          content: "Primer mensaje de IA",
          sentAt: "2026-06-18T10:00:00Z",
        },
        {
          id: "m-2",
          senderRole: "consumer",
          content: "Respuesta del usuario",
          sentAt: "2026-06-18T10:00:01Z",
        },
        {
          id: "m-3",
          senderRole: "chatbot",
          content: "Último mensaje de IA",
          sentAt: "2026-06-18T10:00:02Z",
        },
      ],
    };

    const visible = mapConversationDetailToVisibleMessages(detail);

    expect(visible[0].recommendedProviders).toBeUndefined();
    expect(visible[0].diagnosisCompleted).toBeUndefined();
    expect(visible[0].assessment).toBeUndefined();

    expect(visible[2].recommendedProviders).toEqual(detail.recommendedProviders);
    expect(visible[2].diagnosisCompleted).toBe(true);
    expect(visible[2].assessment).toEqual({ outcome: "professional_required" });
  });
});
