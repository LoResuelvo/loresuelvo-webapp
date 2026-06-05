"use client";

import { X } from "lucide-react";
import { ProviderWorkRequest } from "@/lib/provider-home/types";
import { MapPin, Calendar } from "lucide-react";

interface RequestDetailModalProps {
  request: ProviderWorkRequest;
  onClose: () => void;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function RequestDetailModal({
  request,
  onClose,
  onAccept,
  onReject,
}: RequestDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[580px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="modal-title" className="text-lg font-semibold text-brand-primary">
            Detalle de Solicitud
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-neutral text-brand-secondary shrink-0">
              <span className="text-lg font-semibold">
                {request.clientName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[18px] font-semibold text-slate-800">
                {request.clientName}
              </p>
              <div className="mt-2 space-y-1">
                <p className="flex items-center gap-2 text-[14px] text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {request.location}
                </p>
                <p className="flex items-center gap-2 text-[14px] text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {request.publishedAtLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[24px] font-bold text-brand-primary leading-tight">
              {request.problemTitle}
            </h3>


            <div className="pt-2 space-y-1">
              <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                Descripción
              </span>
              <p className="text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <button
            type="button"
            className="w-full bg-brand-accept hover:bg-brand-accept/90 text-white rounded-lg py-3 text-[15px] font-semibold transition-colors"
            onClick={() => onAccept(request.id)}
          >
            Aceptar Solicitud
          </button>
          <button
            type="button"
            className="w-full bg-brand-danger hover:bg-brand-danger/90 text-white rounded-lg py-3 text-[15px] font-semibold transition-colors"
            onClick={() => onReject(request.id)}
          >
            Rechazar Solicitud
          </button>
        </div>
      </div>
    </div>
  );
}