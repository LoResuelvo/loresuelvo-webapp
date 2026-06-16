"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Info } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { saveAiMessages, loadAiMessages, type AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { t } from "@/infrastructure/i18n/translations";

const HERO_IMAGE = "/illustrations/hero-home-ai-diagnosis.png";

const MAX_LINES = 6;
const INITIAL_HEIGHT = 50;
const LINE_HEIGHT_CSS = 24;

const USER_ID = "consumer-ai-diagnosis";

export default function DiagnosisHero() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    const newMessage: AiMessage = {
      id: `msg-user-${Date.now()}`,
      content: trimmed,
      senderId: USER_ID,
      sentAt: new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const existingMessages = loadAiMessages();
    saveAiMessages([...existingMessages, newMessage]);

    setMessage("");
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.rows = 2;
      textarea.style.height = `${INITIAL_HEIGHT}px`;
      textarea.style.overflowY = "hidden";
    }

    router.push(ROUTES.consumer.aiMessages);
  };

  return (
    <section
      aria-label={t.consumerDiagnosis.hero.ariaLabel}
      className="relative rounded-2xl border border-white/30 shadow-sm overflow-hidden min-h-[340px] md:min-h-[380px]"
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
          <div className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 p-2">
            <Textarea
              ref={textareaRefCallback}
              id="diagnosis-message"
              value={message}
              onChange={handleChange}
              placeholder={t.consumerDiagnosis.hero.placeholder}
              className="flex-1 min-w-0 rounded-lg bg-white/20 backdrop-blur px-4 py-3 text-[16px] text-white placeholder:text-white/70 focus-visible:ring-2 focus-visible:ring-white/70 resize-none leading-6 min-h-0"
            />
            <Button
              type="submit"
              className="rounded-lg bg-brand-primary text-white font-semibold px-6 py-3 h-auto hover:opacity-95 transition-opacity whitespace-nowrap shadow-sm"
            >
              {t.consumerDiagnosis.hero.buttonText}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-[14px] mt-3">
            <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{t.consumerDiagnosis.hero.infoText}</span>
          </div>
        </form>
      </div>
    </section>
  );
}
