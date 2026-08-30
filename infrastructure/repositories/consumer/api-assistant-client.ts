import { AssistantClient } from "@/ports/assistant-client";
import type { ApiStub } from "@/infrastructure/api/types";
import { logger } from "@/infrastructure/logging/logger";

import { parseE2EStubsFromCookies, E2E_SESSION_COOKIE } from "@/infrastructure/api/e2e-stubs-utils";

function getE2EStub(method: string, endpoint: string): ApiStub | null {
  if (typeof document === "undefined") return null;

  const cookieStrings = document.cookie.split(";").map((c) => c.trim());
  const cookies = cookieStrings.map((c) => {
    const [name, ...rest] = c.split("=");
    return { name, value: rest.join("=") };
  });

  const hasSession = cookies.some((c) => c.name === E2E_SESSION_COOKIE);
  if (!hasSession) return null;

  const stubs = parseE2EStubsFromCookies(cookies);
  return stubs.find(
    (s) => s.method.toUpperCase() === method.toUpperCase() && s.endpoint === endpoint
  ) ?? null;
}

export function createApiAssistantClient(accessToken?: string): AssistantClient {
  return {
    async requestReply(userMessage: string): Promise<string> {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      const stub = getE2EStub("POST", "/chatbot/conversations");
      if (stub) {
        logger.debug(`[ApiAssistantClient] [E2E] Stub found: ${stub.status} for POST /chatbot/conversations`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (stub.status >= 400) {
          throw new Error(`API Error: ${stub.status}`);
        }
        const data = stub.body as { response?: { content?: string }; content?: string; reply?: string; message?: string };
        return data.response?.content ?? data.content ?? data.reply ?? data.message ?? "";
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        accept: "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const response = await fetch(`${baseUrl}/chatbot/conversations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: userMessage }),
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data.response?.content ?? data.content ?? data.reply ?? data.message ?? "";
    },

    async getConversation(conversationId: string): Promise<{
      id: string;
      title: string;
      messages: Array<{
        id: string;
        content: string;
        senderRole: "consumer" | "chatbot";
        sentAt: string;
      }>;
    }> {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      const stub = getE2EStub("GET", `/conversations/${conversationId}`);
      if (stub) {
        console.log(`[ApiAssistantClient] [E2E] Stub found: ${stub.status} for GET /conversations/${conversationId}`);
        if (stub.status >= 400) {
          throw new Error(`API Error: ${stub.status}`);
        }
        return stub.body as {
          id: string;
          title: string;
          messages: Array<{
            id: string;
            content: string;
            senderRole: "consumer" | "chatbot";
            sentAt: string;
          }>;
        };
      }

      const headers: Record<string, string> = {
        accept: "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const response = await fetch(`${baseUrl}/conversations/${conversationId}`, {
        method: "GET",
        headers,
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
  };
}
