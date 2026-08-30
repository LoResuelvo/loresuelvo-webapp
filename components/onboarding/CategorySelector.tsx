"use client";

import { Label } from "@/components/ui/label";
import { Category } from "@/domain/shared/types";
import { cn } from "@/lib/utils";

export interface CategorySelectorProps {
  categories: Category[];
  error?: string | null;
  onChange: () => void;
  className?: string;
}

export function CategorySelector({
  categories,
  error,
  onChange,
  className,
}: CategorySelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="categoryId" className="text-body font-semibold text-brand-primary">
        Rubro
      </Label>
      <select
        id="categoryId"
        name="categoryId"
        required
        className={`h-[46px] w-full rounded-lg border border-border bg-brand-neutral/30 px-3 text-body-lg text-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary ${
          error ? "border-destructive focus:ring-destructive" : ""
        }`}
        onChange={onChange}
        defaultValue=""
      >
        <option value="" disabled>
          Selecciona un rubro
        </option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Alias for backwards compatibility
export { CategorySelector as CategorySelect };
