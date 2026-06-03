"use client";

import { useState } from "react";
import { X, User } from "lucide-react";
import { Provider } from "@/lib/api/types";

interface WorkRequestModalProps {
  provider: Provider;
  onClose: () => void;
}

export default function WorkRequestModal({ provider, onClose }: WorkRequestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-[18px] text-brand-primary">Crear Solicitud de Trabajo</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300/35">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h5 className="font-bold text-brand-primary text-[14px]">
                {provider.name} {provider.surname}
              </h5>
              <p className="text-[12px] text-slate-400">
                Categoría: {provider.category_name}
              </p>
            </div>
          </div>

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
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-[14px] rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            Enviar solicitud
          </button>

        </form>

      </div>
    </div>
  );
}
