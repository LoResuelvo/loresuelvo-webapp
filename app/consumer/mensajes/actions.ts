"use server";

import { conversationsClient } from "@/lib/conversations-client";

interface ConversationDetail {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name: string;
  };
  messages: {
    id: number;
    sender_role: string;
    content: string;
    created_on: string;
  }[];
  updated_on: string;
}

export async function getConversationDetail(id: string): Promise<ConversationDetail> {
  return conversationsClient.getConversation(id) as Promise<ConversationDetail>;
}

export async function createConversation(providerId: number, content: string): Promise<{ id: number }> {
  return conversationsClient.createConversation({ counterpart_id: providerId, content }) as Promise<{ id: number }>;
}

export async function sendMessage(conversationId: string, content: string): Promise<unknown> {
  return conversationsClient.sendMessage(conversationId, { content });
}