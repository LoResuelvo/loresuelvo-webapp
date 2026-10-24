const PROFILE_ORIGIN_KEY = "loresuelvo:mercado-pago:connection-origin";
const PROFILE_ORIGIN_TTL_MS = 30 * 60 * 1000;

type SessionStoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface ProfileOriginOptions {
  storage?: SessionStoragePort;
  now?: number;
}

function browserSessionStorage(): SessionStoragePort | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function markMercadoPagoConnectionFromProfile({
  storage = browserSessionStorage() ?? undefined,
  now = Date.now(),
}: ProfileOriginOptions = {}): void {
  if (!storage) return;

  try {
    storage.setItem(
      PROFILE_ORIGIN_KEY,
      JSON.stringify({ origin: "profile", startedAt: now }),
    );
  } catch {
    // Authorization should remain available if browser storage is disabled.
  }
}

export function consumeMercadoPagoConnectionOrigin({
  storage = browserSessionStorage() ?? undefined,
  now = Date.now(),
}: ProfileOriginOptions = {}): boolean {
  if (!storage) return false;

  try {
    const storedOrigin = storage.getItem(PROFILE_ORIGIN_KEY);
    storage.removeItem(PROFILE_ORIGIN_KEY);
    if (!storedOrigin) return false;

    const marker: unknown = JSON.parse(storedOrigin);
    if (!marker || typeof marker !== "object") return false;

    const { origin, startedAt } = marker as {
      origin?: unknown;
      startedAt?: unknown;
    };
    if (origin !== "profile" || typeof startedAt !== "number") return false;

    const age = now - startedAt;
    return age >= 0 && age <= PROFILE_ORIGIN_TTL_MS;
  } catch {
    return false;
  }
}

export function clearMercadoPagoConnectionOrigin({
  storage = browserSessionStorage() ?? undefined,
}: ProfileOriginOptions = {}): void {
  if (!storage) return;

  try {
    storage.removeItem(PROFILE_ORIGIN_KEY);
  } catch {
    // A stale origin marker must not block a new authorization attempt.
  }
}
