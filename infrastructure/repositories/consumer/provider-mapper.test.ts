import { describe, expect, it } from "vitest";
import type { ApiProvider } from "@/infrastructure/api/types";
import { mapApiToProvider } from "./provider-mapper";

function aSearchApiProvider(overrides: Partial<ApiProvider> = {}): ApiProvider {
  return {
    identity_verified: false,
    id: 1,
    name: "Juan",
    surname: "Pérez",
    category_name: "Plomería",
    profile_photo_url: "https://example.com/juan.jpg",
    rating_average: 4.5,
    rating_count: 2,
    ...overrides,
  };
}

describe("mapApiToProvider", () => {
  it("excludes private verification fields from the public model", () => {
    // Simulate fields outside the public contract only at the transport boundary.
    const externalPayload: unknown = {
      ...aSearchApiProvider({ identity_verified: true }),
      identity_verification_status: "synthetic-internal-approved",
      identity_verified_on: "2099-01-02T03:04:05Z",
      identity_verification_session_id: "synthetic-private-session",
      identity_document: { number: "synthetic-private-document" },
    };
    const publicModel = mapApiToProvider(externalPayload as ApiProvider);
    expect(publicModel).toEqual(mapApiToProvider(aSearchApiProvider({ identity_verified: true })));
    expect(publicModel.identityVerified).toBe(true);
  });

  it.each([undefined, null, "true", 1])("does not verify a malformed external identity value %s", (value) => {
    // Simulate untrusted transport data only at the mapper boundary.
    const externalPayload: unknown = { ...aSearchApiProvider(), identity_verified: value };
    expect(mapApiToProvider(externalPayload as ApiProvider).identityVerified).toBe(false);
  });

  it.each([true, false])("maps the public identity verification flag %s", (identityVerified) => {
    const api = { ...aSearchApiProvider(), identity_verified: identityVerified };
    expect(mapApiToProvider(api)).toHaveProperty("identityVerified", identityVerified);
  });
  it("maps the API rating average and count to the provider reputation", () => {
    const provider = mapApiToProvider(aSearchApiProvider());

    expect(provider.rating).toBe(4.5);
    expect(provider.reviews).toBe(2);
  });

  it("preserves zero rating and review values", () => {
    const provider = mapApiToProvider(aSearchApiProvider({ rating_average: 0, rating_count: 0 }));

    expect(provider.rating).toBe(0);
    expect(provider.reviews).toBe(0);
  });

  it("keeps each provider reputation associated with its own API payload", () => {
    const juan = mapApiToProvider(aSearchApiProvider({ id: 1, rating_average: 5, rating_count: 12 }));
    const pedro = mapApiToProvider(
      aSearchApiProvider({ id: 2, name: "Pedro", surname: "Dib", rating_average: 2, rating_count: 3 }),
    );

    expect({ name: juan.name, rating: juan.rating, reviews: juan.reviews }).toEqual({
      name: "Juan",
      rating: 5,
      reviews: 12,
    });
    expect({ name: pedro.name, rating: pedro.rating, reviews: pedro.reviews }).toEqual({
      name: "Pedro",
      rating: 2,
      reviews: 3,
    });
  });

  it("does not invent a jobs count in the mapped provider", () => {
    const provider = mapApiToProvider(aSearchApiProvider());

    expect(provider).not.toHaveProperty("jobs");
  });
});
