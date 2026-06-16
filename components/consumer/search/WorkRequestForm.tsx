"use client";

import { useState } from "react";
import { Provider } from "@/infrastructure/api/types";
import { createJobRequest } from "@/app/consumidor/buscar/actions";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { ProviderMiniProfile } from "./ProviderMiniProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/infrastructure/i18n/translations";

interface WorkRequestFormProps {
  provider: Provider;
}

export function WorkRequestForm({ provider }: WorkRequestFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError(t.consumerSearch.form.validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createJobRequest(provider.id, title.trim(), description.trim());
      
      if (!result.success) {
        let displayError = t.consumerSearch.form.errorGeneric;
        
        if (result.error.includes("Job request already exists") || result.error.includes("Conversation already exists")) {
          displayError = t.consumerSearch.form.errorDuplicate;
        } else if (result.error.includes("Only consumers can create job requests")) {
          displayError = t.consumerSearch.form.errorRole;
        } else if (result.error.includes("Provider does not exist")) {
          displayError = t.consumerSearch.form.errorUnavailable;
        } else if (result.error.includes("Title is required") || result.error.includes("Provider id is required")) {
          displayError = t.consumerSearch.form.errorMissing;
        }

        setError(displayError);
        setIsSubmitting(false);
        return;
      }

      router.push(
        `${ROUTES.consumer.messages}?provider_id=${provider.id}&name=${encodeURIComponent(provider.name)}&surname=${encodeURIComponent(provider.surname)}`
      );
    } catch (err: unknown) {
      console.error("Unexpected error creating work request:", err);
      setError(t.consumerSearch.form.errorUnexpected);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
      
      <ProviderMiniProfile provider={provider} />

      <div className="text-[13px] text-slate-500 leading-relaxed">
        {t.consumerSearch.form.description}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title-input" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t.consumerSearch.form.titleLabel}
        </Label>
        <Input
          id="title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.consumerSearch.form.titlePlaceholder}
          className="px-4 py-2.5 h-auto bg-slate-50 hover:bg-slate-100 focus:bg-white border-slate-200 focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary text-brand-primary placeholder:text-slate-400 font-medium text-[13px] rounded-xl"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc-input" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t.consumerSearch.form.descLabel}
        </Label>
        <Textarea
          id="desc-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.consumerSearch.form.descPlaceholder}
          rows={4}
          className="px-4 py-2.5 min-h-[100px] bg-slate-50 hover:bg-slate-100 focus:bg-white border-slate-200 focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary text-brand-primary placeholder:text-slate-400 font-medium text-[13px] rounded-xl resize-none"
          required
        />
      </div>

      {error && (
        <div className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-3 rounded-xl">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-auto py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-[14px] rounded-xl shadow-sm"
      >
        {isSubmitting ? t.consumerSearch.form.submitLoading : t.consumerSearch.form.submit}
      </Button>
    </form>
  );
}
