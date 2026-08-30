"use client";

import React from "react";
import { t } from "@/infrastructure/i18n/translations";

export interface CompletionFormFieldsProps {
  description: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CompletionFormFields({
  description,
  onChange,
  disabled = false,
}: CompletionFormFieldsProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="completion-description"
        className="text-sm font-semibold text-slate-700"
      >
        {t.workOrderCompletion.descriptionLabel}
        <span className="text-red-500 ml-1">*</span>
      </label>
      <textarea
        id="completion-description"
        value={description}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.workOrderCompletion.descriptionPlaceholder}
        disabled={disabled}
        rows={4}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary text-sm text-slate-800 placeholder:text-slate-400 transition-all resize-none disabled:bg-slate-50 disabled:opacity-70"
      />
    </div>
  );
}
