import type { ApiAiConversation, ApiAiConversationDetail } from "@/infrastructure/api/types";
import type { AiChatRepository } from "@/ports/ai-chat-repository";
import { AiConversationContact, AiConversationDetail } from "@/domain/messaging/types";
import { mapApiToAiConversationContact, mapApiToAiConversationDetail } from "./ai-chat-mapper";
import type { ApiStub } from "@/infrastructure/api/types";

const E2E_API_STUBS_COOKIE = "__e2e_api_stubs";
const E2E_SESSION_COOKIE = "__e2e_session";

async function getE2EStub(method: string, endpoint: string): Promise<ApiStub | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    if (!cookieStore.has("__e2e_session")) return null;

    const stubsCookieValue = cookieStore.get("__e2e_api_stubs")?.value;
    if (!stubsCookieValue) return null;

    const stubs = JSON.parse(decodeURIComponent(stubsCookieValue)) as ApiStub[];
    return stubs.find(
      (s) => s.method.toUpperCase() === method.toUpperCase() && s.endpoint === endpoint
    ) ?? null;
  } catch {
    return null;
  }
}

function getE2EStubClient(method: string, endpoint: string): ApiStub | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";").map((c) => c.trim());
  const stubsCookie = cookies.find((c) => c.startsWith(`${E2E_API_STUBS_COOKIE}=`));
  if (!stubsCookie) return null;

  const hasSession = cookies.some((c) => c.startsWith(`${E2E_SESSION_COOKIE}=`));
  if (!hasSession) return null;

  try {
    const stubsValue = stubsCookie.split("=")[1];
    const stubs = JSON.parse(decodeURIComponent(stubsValue)) as ApiStub[];
    return stubs.find(
      (s) => s.method.toUpperCase() === method.toUpperCase() && s.endpoint === endpoint
    ) ?? null;
  } catch {
    return null;
  }
}

export class ApiAiChatRepository implements AiChatRepository {
  private accessToken?: string;
  private baseUrl: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const method = options?.method || "GET";
    let stub = await getE2EStub(method, endpoint);
    if (!stub) {
      stub = getE2EStubClient(method, endpoint);
    }
    if (stub) {
      return stub.body as T;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      accept: "application/json",
    };
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getConversations(): Promise<AiConversationContact[]> {
    const data = await this.fetch<ApiAiConversation[]>("/chatbot/conversations");
    return data.map(mapApiToAiConversationContact);
  }

  async getById(id: string): Promise<AiConversationDetail> {
    const data = await this.fetch<ApiAiConversationDetail>(`/conversations/${id}`);
    return mapApiToAiConversationDetail(data);
  }

  async create(content: string): Promise<AiConversationDetail> {
    const data = await this.fetch<ApiAiConversationDetail>("/chatbot/conversations", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return mapApiToAiConversationDetail(data);
  }

  async sendMessage(conversationId: string, content: string): Promise<AiConversationDetail> {
    const data = await this.fetch<ApiAiConversationDetail>(
      `/chatbot/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      }
    );
    return mapApiToAiConversationDetail(data);
  }
}
