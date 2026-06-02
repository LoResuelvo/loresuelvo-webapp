"use client";

import { X } from "lucide-react";
import { ProviderWorkRequest } from "@/lib/provider-home/types";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, User } from "lucide-react";

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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
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

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-neutral text-brand-secondary shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-semibold text-brand-secondary">
                {request.clientName}
              </p>
              <p className="flex items-center gap-1.5 text-[14px] text-slate-500 mt-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {request.location}
              </p>
              <p className="flex items-center gap-1.5 text-[14px] text-slate-500 mt-0.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {request.publishedAtLabel}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[20px] font-bold text-brand-primary">
              {request.problemTitle}
            </h3>
            <span className="inline-block px-3 py-1 bg-brand-neutral text-brand-secondary text-[13px] font-medium rounded-full">
              {request.category}
            </span>
            <p className="text-[15px] leading-6 text-slate-600">
              {request.description}
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            className="flex-1 bg-brand-secondary hover:bg-brand-secondary/80 text-white rounded-lg py-3 text-[15px] font-semibold"
            onClick={() => onAccept(request.id)}
          >
            Aceptar Solicitud
          </Button>
          <Button
            type="button"
            className="flex-1 bg-brand-danger hover:bg-brand-danger/90 text-white rounded-lg py-3 text-[15px] font-semibold"
            onClick={() => onReject(request.id)}
          >
            Rechazar Solicitud
          </Button>
        </div>
      </div>
    </div>
  );
}