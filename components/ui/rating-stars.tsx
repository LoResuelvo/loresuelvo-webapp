import { Star } from "lucide-react";

interface RatingStarsProps {
  rating?: number;
  maxStars?: number;
}

export function RatingStars({ rating, maxStars = 5 }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(maxStars)].map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 fill-current ${
            rating && i < Math.floor(rating)
              ? "text-amber-400"
              : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
