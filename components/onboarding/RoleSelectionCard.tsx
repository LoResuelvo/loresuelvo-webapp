"use client";

import { LucideIcon } from "lucide-react";

interface RoleSelectionCardProps {
  id: string;
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function RoleSelectionCard({
  id,
  selected,
  onClick,
  title,
  description,
  icon: Icon,
}: RoleSelectionCardProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={`w-full flex flex-col items-center justify-center p-6 rounded-xl border-2 text-center transition-all duration-200 ${
        selected
          ? "border-brand-primary bg-brand-primary/5"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className={`p-3 rounded-full mb-3 ${selected ? "bg-brand-primary/10" : "bg-gray-100"}`}>
        <Icon className={`h-6 w-6 ${selected ? "text-brand-primary" : "text-gray-600"}`} />
      </div>
      <span className="text-[17px] font-bold text-brand-primary">{title}</span>
      <span className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        {description}
      </span>
    </button>
  );
}
