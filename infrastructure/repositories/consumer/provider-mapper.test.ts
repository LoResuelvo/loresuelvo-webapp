import { describe, expect, it } from "vitest";
import type { ApiProvider } from "@/infrastructure/api/types";
import { mapApiToProvider } from "./provider-mapper";

function aSearchApiProvider(overrides: Partial<ApiProvider> = {}): ApiProvider {
  return {
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
