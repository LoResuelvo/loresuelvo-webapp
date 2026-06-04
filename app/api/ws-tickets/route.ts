import { api, ApiClientError } from "@/lib/api/base-client";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const data = await api.post<{ ticket: string }>("/ws-tickets", undefined);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to issue WebSocket ticket" }, { status: 500 });
  }
}
