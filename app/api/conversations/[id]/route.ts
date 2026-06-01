import { NextRequest, NextResponse } from "next/server";
import { getAuthService } from "@/lib/auth";

const API_BASE_URL = process.env.API_URL || "http://localhost:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthService().getSession();
    const token = session?.accessToken;

    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Proxy] GET /conversations/[id] error:", error);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
