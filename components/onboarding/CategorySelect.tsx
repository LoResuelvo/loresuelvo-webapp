"use client";

import { Label } from "@/components/ui/label";
import { Category } from "@/infrastructure/api/types";

interface CategorySelectProps {
  categories: Category[];
  error: string | null;
  onChange: () => void;
}

export function CategorySelect({ categories, error, onChange }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="categoryId" className="text-[14px] font-semibold text-brand-primary">
        Rubro
      </Label>
      <select
        id="categoryId"
        name="categoryId"
        required
        className={`h-[46px] w-full rounded-lg border border-border bg-brand-neutral/30 px-3 text-[15px] text-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary ${
          error ? "border-destructive focus:ring-destructive" : ""
        }`}
        onChange={onChange}
        defaultValue=""
      >
        <option value="" disabled>
          Selecciona un rubro
        </option>
        {categories.map((cat) => {
          const catId = cat.id;
          const catName = cat.name;
          return (
            <option key={catId} value={catId}>
              {catName}
            </option>
          );
        })}
      </select>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
