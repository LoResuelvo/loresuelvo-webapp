import type {
  WorkOrderReview as WorkOrderReviewType,
  WorkOrderReviewInput,
} from "./types";

export type { WorkOrderReviewType };

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_DESCRIPTION_LENGTH = 500;

export function isValidRating(rating: unknown): rating is number {
  return (
    typeof rating === "number" &&
    Number.isInteger(rating) &&
    rating >= MIN_RATING &&
    rating <= MAX_RATING
  );
}

export function isValidDescription(description?: unknown): boolean {
  if (description === undefined || description === null || description === "") {
    return true;
  }
  if (typeof description !== "string") {
    return false;
  }
  return description.length <= MAX_DESCRIPTION_LENGTH;
}

export function validateReviewInput(input: WorkOrderReviewInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isValidRating(input.rating)) {
    errors.push(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`);
  }

  const commentText = input.description ?? input.comment;
  if (!isValidDescription(commentText)) {
    errors.push(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createReview(input: WorkOrderReviewInput): WorkOrderReviewType {
  const validation = validateReviewInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join(", "));
  }

  const comment = (input.description ?? input.comment ?? "").trim();

  return Object.freeze({
    rating: input.rating,
    comment: comment || undefined,
    description: comment || undefined,
  });
}

export const WorkOrderReviewModule = {
  MIN_RATING,
  MAX_RATING,
  MAX_DESCRIPTION_LENGTH,
  isValidRating,
  isValidDescription,
  validateReviewInput,
  createReview,
};

export const WorkOrderReview = WorkOrderReviewModule;
