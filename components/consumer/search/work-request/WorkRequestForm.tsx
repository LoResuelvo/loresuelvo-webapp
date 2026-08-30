"use client";

import { Provider } from "@/domain/provider/types";
import { ProviderMiniProfile } from "./ProviderMiniProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/infrastructure/i18n/translations";
import { ImageAttachmentSelector } from "./ImageAttachmentSelector";
import { CharacterCounter } from "./CharacterCounter";
import { useWorkRequestForm } from "./useWorkRequestForm";

interface WorkRequestFormProps {
  provider: Provider;
}

const MAX_TITLE_LENGTH = 100;
const MAX_DESC_LENGTH = 1000;

export function WorkRequestForm({ provider }: WorkRequestFormProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    error,
    setError,
    isSubmitting,
    attachedFiles,
    setAttachedFiles,
    isUploading,
    handleSubmit,
  } = useWorkRequestForm(provider);

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
      <ProviderMiniProfile provider={provider} />

      <div className="text-small text-slate-500 leading-relaxed">
        {t.consumerSearch.form.description}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="title-input" className="text-caption font-bold text-slate-400 uppercase tracking-wider">
            {t.consumerSearch.form.titleLabel}
          </Label>
          <CharacterCounter current={title.length} max={MAX_TITLE_LENGTH} />
        </div>
        <Input
          id="title-input"
          type="text"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.consumerSearch.form.titlePlaceholder}
          className="px-4 py-2.5 h-auto bg-slate-50 hover:bg-slate-100 focus:bg-white border-slate-200 focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary text-brand-primary placeholder:text-slate-400 font-medium text-small rounded-xl"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="desc-input" className="text-caption font-bold text-slate-400 uppercase tracking-wider">
            {t.consumerSearch.form.descLabel}
          </Label>
          <CharacterCounter current={description.length} max={MAX_DESC_LENGTH} />
        </div>
        <Textarea
          id="desc-input"
          value={description}
          maxLength={MAX_DESC_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.consumerSearch.form.descPlaceholder}
          rows={4}
          className="px-4 py-2.5 min-h-[100px] bg-slate-50 hover:bg-slate-100 focus:bg-white border-slate-200 focus-visible:border-brand-primary focus-visible:ring-1 focus-visible:ring-brand-primary text-brand-primary placeholder:text-slate-400 font-medium text-small rounded-xl resize-none"
          required
        />
      </div>

      <ImageAttachmentSelector
        files={attachedFiles}
        onChange={setAttachedFiles}
        maxFiles={3}
        disabled={isSubmitting}
        onError={setError}
      />

      {isUploading && (
        <div className="text-xs text-brand-primary font-semibold bg-brand-secondary/10 border border-brand-secondary/20 p-3 rounded-xl flex items-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-brand-primary border-t-transparent" />
          {t.consumerSearch.form.uploadingImages}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-3 rounded-xl">
          {error}
        </div>
      )}

      <Button
        variant="brand"
        size="action"
        type="submit"
        disabled={isSubmitting}
        className="shadow-sm"
      >
        {isSubmitting ? t.consumerSearch.form.submitLoading : t.consumerSearch.form.submit}
      </Button>
    </form>
  );
}
