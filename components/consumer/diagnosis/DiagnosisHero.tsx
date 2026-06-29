"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Info, Paperclip, X } from "lucide-react";
import Image from "next/image";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { t } from "@/infrastructure/i18n/translations";
import { createAiConversationAction } from "@/app/consumidor/mensajes-ia/actions";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";
import { ImagePreviewModal } from "@/components/messaging/ImagePreviewModal";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/illustrations/hero-home-ai-diagnosis.png";

const MAX_LINES = 6;
const INITIAL_HEIGHT = 50;
const LINE_HEIGHT_CSS = 24;

interface DiagnosisHeroProps {
  className?: string;
}

export default function DiagnosisHero({ className }: DiagnosisHeroProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          setError(t.messaging.fileTooLarge);
          return false;
        }
        
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          setError(t.messaging.photoInvalidFormat);
          return false;
        }
        
        return true;
      });
      if (validFiles.length > 0) {
        setError(null);
        setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5));
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setMessage(newValue);
    const isEmpty = !newValue || !newValue.trim();
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (isEmpty) {
      textarea.rows = 2;
      textarea.style.height = `${INITIAL_HEIGHT}px`;
      textarea.style.overflowY = "hidden";
      return;
    }
    const lineCount = newValue.split("\n").length;
    const effectiveLines = Math.min(Math.max(lineCount, 1), MAX_LINES);
    textarea.rows = effectiveLines;
    const maxHeight = LINE_HEIGHT_CSS * MAX_LINES;
    textarea.style.height = "auto";
    const hasOverflow = textarea.scrollHeight > maxHeight;
    textarea.style.overflowY = hasOverflow ? "auto" : "hidden";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };

  const textareaRefCallback = useCallback((node: HTMLTextAreaElement | null) => {
    if (node) {
      textareaRef.current = node;
      node.rows = 2;
      node.style.height = `${INITIAL_HEIGHT}px`;
      node.style.overflowY = "hidden";
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && attachedFiles.length === 0) || isLoading) return;

    setIsLoading(true);
    setError(null);

    const uploadedImageIds: string[] = [];

    try {
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const presigned = await getPresignedUrlAction(file.name, file.type, file.size, "chatbot_message_image");
          const uploadRes = await fetch(presigned.upload_url, {
            method: "PUT",
            body: file,
            headers: presigned.headers,
          });
          if (!uploadRes.ok) throw new Error("Error al subir archivo a R2");
          const confirm = await confirmUploadAction(presigned.file_id, presigned.key, file.type, file.size);
          uploadedImageIds.push(confirm.id);
        }
      }

      console.log("[DiagnosisHero] Creating conversation with:", trimmed, uploadedImageIds);
      const conversation = await createAiConversationAction(trimmed, uploadedImageIds.length > 0 ? uploadedImageIds : undefined);
      console.log("[DiagnosisHero] Conversation created:", conversation);
      router.push(`${ROUTES.consumer.aiMessages}?id=${conversation.id}`);
    } catch (err) {
      console.error("[DiagnosisHero] Failed to create conversation:", err);
      setError("No pudimos iniciar el diagnóstico en este momento");
      setIsLoading(false);
    }
  };

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
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-900/20"
      />

      <div className="relative h-full p-6 md:p-10 flex flex-col justify-center max-w-3xl gap-6">
        <div className="flex items-center gap-2.5 text-white">
          <Sparkles className="w-6 h-6" aria-hidden="true" />
          <span className="text-[16px] font-semibold tracking-wide uppercase">
            {t.consumerDiagnosis.hero.badge}
          </span>
        </div>
        <h1 className="text-[30px] md:text-[36px] font-bold tracking-tight text-white drop-shadow">
          {t.consumerDiagnosis.hero.title}
        </h1>

        <form onSubmit={handleSubmit}>
          <Label htmlFor="diagnosis-message" className="sr-only">
            {t.consumerDiagnosis.hero.label}
          </Label>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png, image/webp"
            multiple
            onChange={handleFileChange}
            disabled={isLoading || attachedFiles.length >= 5}
          />
          <div className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 p-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attachedFiles.length >= 5}
              aria-label="Adjuntar imágenes"
              className="text-white hover:text-white/80 hover:bg-white/10 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Textarea
              ref={textareaRefCallback}
              id="diagnosis-message"
              value={message}
              onChange={handleChange}
              placeholder={t.consumerDiagnosis.hero.placeholder}
              className="flex-1 min-w-0 rounded-lg bg-white/20 backdrop-blur px-4 py-3 text-[16px] text-white placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-white/70 resize-none leading-6 min-h-0"
            />
            <Button
              variant="brand"
              type="submit"
              className="px-6 py-3 h-auto whitespace-nowrap shadow-sm font-semibold rounded-lg"
              disabled={isLoading}
            >
              {t.consumerDiagnosis.hero.buttonText}
            </Button>
          </div>
          {attachedFiles.length > 0 && (
            <div role="region" aria-label="Imágenes adjuntas" className="mt-3 flex gap-2 overflow-x-auto p-1">
              {attachedFiles.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url, name: file.name })}
                      className="w-16 h-16 rounded-md overflow-hidden border border-white/20 bg-white/10 relative cursor-pointer block hover:ring-2 hover:ring-white/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <Image
                        src={url}
                        alt={`Vista previa de ${file.name}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      aria-label={`Eliminar ${file.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {error && (
            <div className="mt-2 text-red-300 text-sm font-medium">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 text-white/80 text-[14px] mt-3">
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
