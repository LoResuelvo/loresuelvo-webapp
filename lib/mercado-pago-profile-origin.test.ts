import { describe, expect, it } from "vitest";
import {
  clearMercadoPagoConnectionOrigin,
  consumeMercadoPagoConnectionOrigin,
  markMercadoPagoConnectionFromProfile,
} from "./mercado-pago-profile-origin";

function createStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  };
}

describe("Mercado Pago profile callback origin", () => {
  it("consumes a fresh profile origin once", () => {
    const storage = createStorage();
    markMercadoPagoConnectionFromProfile({ storage, now: 1000 });

    expect(consumeMercadoPagoConnectionOrigin({ storage, now: 1001 })).toBe(true);
    expect(consumeMercadoPagoConnectionOrigin({ storage, now: 1001 })).toBe(false);
  });

  it("clears stale, malformed, and unrelated markers", () => {
    const storage = createStorage();
    markMercadoPagoConnectionFromProfile({ storage, now: 1000 });
    expect(consumeMercadoPagoConnectionOrigin({ storage, now: 1_801_001 })).toBe(false);

    storage.setItem("loresuelvo:mercado-pago:connection-origin", "not-json");
    expect(consumeMercadoPagoConnectionOrigin({ storage, now: 1001 })).toBe(false);

    storage.setItem(
      "loresuelvo:mercado-pago:connection-origin",
      JSON.stringify({ origin: "onboarding", startedAt: 1000 }),
    );
    expect(consumeMercadoPagoConnectionOrigin({ storage, now: 1001 })).toBe(false);
  });

  it("clears a pending origin before a new onboarding authorization", () => {
    const storage = createStorage();
    markMercadoPagoConnectionFromProfile({ storage, now: 1000 });

    clearMercadoPagoConnectionOrigin({ storage });

    expect(consumeMercadoPagoConnectionOrigin({ storage, now: 1001 })).toBe(false);
  });
});
