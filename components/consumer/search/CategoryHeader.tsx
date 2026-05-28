import { Wrench } from "lucide-react";

interface CategoryHeaderProps {
  categoryName: string;
}

export default function CategoryHeader({ categoryName }: CategoryHeaderProps) {
  return (
    <>
      <div className="mb-4">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 uppercase border border-emerald-200/50 shadow-sm">
          <Wrench className="w-3.5 h-3.5" />
          CATEGORÍA: {categoryName}
        </span>
      </div>

      <h2 className="text-[32px] font-extrabold tracking-tight text-brand-primary mb-8">
        Prestadores
      </h2>
    </>
  );
}
