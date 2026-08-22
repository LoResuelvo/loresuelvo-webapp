"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  maxStars?: number;
  id?: string;
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  maxStars = 5,
  id = "star-rating",
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Calificación con estrellas"
      className="flex items-center gap-1"
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starNumber = i + 1;
        const isFilled = (hoverRating || value) >= starNumber;

        return (
          <button
            key={starNumber}
            type="button"
            role="radio"
            aria-checked={value === starNumber}
            aria-label={`${starNumber} ${starNumber === 1 ? "estrella" : "estrellas"}`}
            disabled={disabled}
            data-testid={`star-rating-${starNumber}`}
            data-rating={starNumber}
            onClick={() => onChange(starNumber)}
            onMouseEnter={() => !disabled && setHoverRating(starNumber)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            className={cn(
              "w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-transform",
              "hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none",
              disabled && "cursor-not-allowed opacity-50 hover:scale-100"
            )}
          >
            <Star
              className={cn(
                "w-7 h-7 transition-colors",
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 fill-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
