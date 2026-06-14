"use server";

import { api } from "@/lib/api/base-client";
import { getAuthService } from "@/lib/auth";

export async function getPresignedUrlAction(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  purpose: string
) {
  const session = await getAuthService().getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  const result = await api.post("/files/presign", {
    original_name: originalName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    purpose: purpose,
  });

  return result as {
    file_id: string;
    key: string;
    upload_url: string;
    headers: Record<string, string>;
  };
}

export async function confirmUploadAction(
  fileId: string,
  key: string,
  mimeType: string,
  sizeBytes: number
) {
  const session = await getAuthService().getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  const result = await api.post(`/files/${fileId}/confirm`, {
    key: key,
    mime_type: mimeType,
    size_bytes: sizeBytes,
  });

  return result as {
    id: string;
    url: string;
    original_name: string;
  };
}
