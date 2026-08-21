export type Rating = {
  readonly value: number;
};

function create(value: number): Rating {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Rating must be a finite number");
  }
  if (value < 1 || value > 5) {
    throw new Error(`Rating must be between 1 and 5 (received: ${value})`);
  }
  return Object.freeze({
    value,
  });
}

function format(rating: Rating): string {
  return rating.value.toFixed(1);
}

function getStarBreakdown(rating: Rating): {
  fullStars: number;
  hasHalfStar: boolean;
  emptyStars: number;
} {
  const fullStars = Math.floor(rating.value);
  const decimal = rating.value - fullStars;
  const hasHalfStar = decimal >= 0.25 && decimal < 0.75;
  const roundedFull = decimal >= 0.75 ? fullStars + 1 : fullStars;
  const emptyStars = Math.max(0, 5 - roundedFull - (hasHalfStar ? 1 : 0));

  return {
    fullStars: roundedFull,
    hasHalfStar,
    emptyStars,
  };
}

export const Rating = {
  create,
  format,
  getStarBreakdown,
};
