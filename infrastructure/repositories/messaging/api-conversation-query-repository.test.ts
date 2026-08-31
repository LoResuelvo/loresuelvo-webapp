import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { ApiConversationQueryRepository } from "./api-conversation-query-repository";
import { ApiConversation, ApiConversationDetail } from "@/infrastructure/api/types";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ApiConversationQueryRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApiConversation: ApiConversation = {
    id: 1,
    status: "pending",
    counterpart: {
      id: 2,
      role: "provider",
      name: "Juan",
      surname: "Perez",
      category_name: "Plomería",
    },
    last_message: {
      id: 10,
      sender_role: "provider",
      content: "Hola",
      created_on: "2026-08-30T10:00:00Z",
    },
    updated_on: "2026-08-30T10:00:00Z",
  };

  it("fetches and maps consumer conversations", async () => {
    vi.mocked(api.get).mockResolvedValue([mockApiConversation]);

    const repository = new ApiConversationQueryRepository();
    const result = await repository.getConsumerConversations();

    expect(api.get).toHaveBeenCalledWith("/conversations");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "conv-1",
      providerId: "2",
      providerName: "Juan",
      providerSurname: "Perez",
      lastMessage: "Hola",
      pending: true,
    });
  });

  it("fetches and maps provider conversations", async () => {
    vi.mocked(api.get).mockResolvedValue([mockApiConversation]);

    const repository = new ApiConversationQueryRepository();
    const result = await repository.getProviderConversations();

    expect(api.get).toHaveBeenCalledWith("/conversations");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "conv-1",
      consumerId: "2",
      consumerName: "Juan",
      consumerSurname: "Perez",
      lastMessage: "Hola",
      pending: true,
    });
  });

  it("fetches and maps conversation detail by id", async () => {
    const mockDetail: ApiConversationDetail = {
      id: 1,
      status: "active",
      counterpart: {
        id: 2,
        role: "provider",
        name: "Juan",
        surname: "Perez",
        category_name: "Plomería",
      },
      messages: [
        {
          id: 10,
          sender_role: "provider",
          content: "Hola",
          created_on: "2026-08-30T10:00:00Z",
        },
      ],
      updated_on: "2026-08-30T10:00:00Z",
    };

    vi.mocked(api.get).mockResolvedValue(mockDetail);

    const repository = new ApiConversationQueryRepository();
    const result = await repository.getById("1");

    expect(api.get).toHaveBeenCalledWith("/conversations/1");
    expect(result.id).toBe(1);
    expect(result.status).toBe("active");
    expect(result.counterpart.name).toBe("Juan");
    expect(result.messages).toHaveLength(1);
  });
});
