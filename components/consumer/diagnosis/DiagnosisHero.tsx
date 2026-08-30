"use client";

import { Sparkles, Info, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { t } from "@/infrastructure/i18n/translations";
import { ImagePreviewModal } from "@/components/messaging/media/ImagePreviewModal";
import { DiagnosisTextInput } from "./DiagnosisTextInput";
import { DiagnosisImageUploader } from "./DiagnosisImageUploader";
import { useInitialDiagnosis } from "./useInitialDiagnosis";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/illustrations/hero-home-ai-diagnosis.png";

interface DiagnosisHeroProps {
  className?: string;
}

export default function DiagnosisHero({ className }: DiagnosisHeroProps) {
  const {
    message,
    setMessage,
    isSubmitting,
    attachedFiles,
    error,
    previewImage,
    setPreviewImage,
    fileInputRef,
    handleFileChange,
    handleRemoveFile,
    handleSubmit,
  } = useInitialDiagnosis();

  return (
    <section
      aria-label={t.consumerDiagnosis.hero.ariaLabel}
      className={cn(
        "relative rounded-2xl border border-white/30 shadow-sm overflow-hidden min-h-[340px] md:min-h-[380px]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/20" />

      <div className="relative h-full p-6 md:p-10 flex flex-col justify-center max-w-3xl gap-6">
        <div className="flex items-center gap-2.5 text-white">
          <Sparkles className="w-6 h-6" aria-hidden="true" />
          <span className="text-body-lg font-semibold tracking-wide uppercase">
            {t.consumerDiagnosis.hero.badge}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow">
          {t.consumerDiagnosis.hero.title}
        </h1>

        <form onSubmit={handleSubmit}>
          <Label htmlFor="diagnosis-message" className="sr-only">
            {t.consumerDiagnosis.hero.label}
          </Label>
          <div className="flex flex-col gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 p-2">
            <DiagnosisImageUploader
              attachedFiles={attachedFiles}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onRemoveFile={handleRemoveFile}
              onPreviewImage={setPreviewImage}
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || attachedFiles.length >= 5}
                aria-label="Adjuntar imágenes"
                className="text-white hover:text-white/80 hover:bg-white/10 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <DiagnosisTextInput
                value={message}
                onChange={setMessage}
                disabled={isSubmitting}
              />
              <Button
                variant="brand"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 h-auto whitespace-nowrap shadow-sm font-semibold rounded-lg disabled:opacity-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Diagnosticando…
                  </>
                ) : (
                  t.consumerDiagnosis.hero.buttonText
                )}
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-red-300 text-sm font-medium">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 text-white/80 text-body mt-3">
            <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{t.consumerDiagnosis.hero.infoText}</span>
          </div>
        </form>
      </div>
      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `${t.messaging.previewTitle} ${previewImage.name}` : ""}
      />
    </section>
  );
}
