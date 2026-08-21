import type { Provider as ProviderType } from "./types";
import { Rating } from "../shared/Rating";

function getDisplayName(provider: Pick<ProviderType, "name" | "surname">): string {
  const name = (provider.name || "").trim();
  const surname = (provider.surname || "").trim();
  return `${name} ${surname}`.trim();
}

function getInitials(provider: Pick<ProviderType, "name" | "surname">): string {
  const name = (provider.name || "").trim();
  const surname = (provider.surname || "").trim();

  const first = name.charAt(0).toUpperCase();
  const last = surname.charAt(0).toUpperCase();

  if (first && last) return `${first}${last}`;
  if (first) return first;
  if (last) return last;
  return "P";
}

function getRatingSummary(provider: Pick<ProviderType, "rating" | "reviews">): {
  rating: Rating | null;
  formattedRating: string;
  reviewsCount: number;
  hasReviews: boolean;
} {
  const count = typeof provider.reviews === "number" ? provider.reviews : 0;
  if (typeof provider.rating === "number" && provider.rating >= 1 && provider.rating <= 5) {
    const ratingVo = Rating.create(provider.rating);
    return {
      rating: ratingVo,
      formattedRating: Rating.format(ratingVo),
      reviewsCount: count,
      hasReviews: count > 0,
    };
  }

  return {
    rating: null,
    formattedRating: "0.0",
    reviewsCount: count,
    hasReviews: false,
  };
}

export const ProviderModule = {
  getDisplayName,
  getInitials,
  getRatingSummary,
};

export const Provider = ProviderModule;
