"use client";

import { useState } from "react";
import { Provider } from "@/lib/api/types";
import { createJobRequest } from "@/app/consumidor/buscar/actions";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { ProviderMiniProfile } from "./ProviderMiniProfile";

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
      setError("Todos los campos son obligatorios");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createJobRequest(provider.id, title.trim(), description.trim());
      
      if (!result.success) {
        let displayError = "Hubo un problema al enviar la solicitud. Por favor intenta de nuevo.";
        
        if (result.error.includes("Job request already exists") || result.error.includes("Conversation already exists")) {
          displayError = "Ya tienes una solicitud de trabajo o conversación pendiente con este profesional.";
        } else if (result.error.includes("Only consumers can create job requests")) {
          displayError = "Solo los clientes pueden crear solicitudes de trabajo.";
        } else if (result.error.includes("Provider does not exist")) {
          displayError = "El profesional seleccionado ya no está disponible.";
        } else if (result.error.includes("Title is required") || result.error.includes("Provider id is required")) {
          displayError = "Faltan datos obligatorios para enviar la solicitud.";
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
      setError("Ocurrió un error inesperado. Por favor revisa tu conexión.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
      
      <ProviderMiniProfile provider={provider} />

      <div className="text-[13px] text-slate-500 leading-relaxed">
        Describe tu problema. Proporciona detalles para que el profesional pueda aceptar tu solicitud y eventualmente darte un presupuesto.
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title-input" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Título del problema
        </label>
        <input
          id="title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Pérdida de agua en termotanque"
          className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-xl text-brand-primary placeholder-slate-400 font-medium text-[13px] transition-all outline-none"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="desc-input" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Descripción del problema
        </label>
        <textarea
          id="desc-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: El termotanque pierde agua por la base. El agua se acumula y el piloto se apaga. Es de la marca X, modelo Y..."
          rows={4}
          className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-xl text-brand-primary placeholder-slate-400 font-medium text-[13px] transition-all outline-none resize-none"
          required
        />
      </div>

      {error && (
        <div className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-[14px] rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
      >
        {isSubmitting ? "Enviando solicitud..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
