"use server";

import { api, ApiClientError } from "@/infrastructure/api/base-client";

export type SetApiClockResult =
  | { ok: true }
  | { ok: false; status: number | null; message?: string | null };

export async function setApiClockAction(nowISO: string): Promise<SetApiClockResult> {
  try {
    await api.post("/test/clock", { now: nowISO });
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
      message: error instanceof ApiClientError ? error.message : null,
    };
  }
}

export async function clearApiClockAction(): Promise<SetApiClockResult> {
  try {
    await api.post("/test/clear", {});
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      status: error instanceof ApiClientError ? error.status : null,
      message: error instanceof ApiClientError ? error.message : null,
    };
  }
}
