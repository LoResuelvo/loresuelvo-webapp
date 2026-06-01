import { NextRequest, NextResponse } from "next/server";
import { getAuthService } from "@/lib/auth";

const API_BASE_URL = process.env.API_URL || "http://localhost:8080";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthService().getSession();
    const token = session?.accessToken;
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/conversations/${id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Proxy] POST /conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
