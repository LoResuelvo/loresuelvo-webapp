"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

const HERO_IMAGE = "/illustrations/hero-home-ai-diagnosis.svg";

export default function DiagnosisHero() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    const url = new URL(ROUTES.consumer.diagnostico, window.location.origin);
    url.searchParams.set("mensaje", trimmed);
    router.push(url.pathname + url.search);
  };

  return (
    <section
      aria-label="Asistente de diagnóstico"
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 md:gap-8 items-center p-6 md:p-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-[26px] md:text-[28px] font-bold tracking-tight text-brand-primary">
            ¿Qué está pasando en tu hogar?
          </h1>
          <p className="text-slate-500 font-medium">
            Contanos qué te pasa y un asistente te ayuda a describir el problema antes de contactar a un profesional.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mt-2">
            <label htmlFor="diagnosis-message" className="sr-only">
              Describí el problema
            </label>
            <input
              id="diagnosis-message"
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe el problema de tu hogar…"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-brand-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand-primary text-white font-semibold px-5 py-3 hover:opacity-95 transition-opacity whitespace-nowrap"
            >
              Diagnosticar
            </button>
          </form>
        </div>

        <div className="relative w-full aspect-[5/4] md:aspect-auto md:h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Persona inspeccionando una pérdida debajo de la bacha"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
