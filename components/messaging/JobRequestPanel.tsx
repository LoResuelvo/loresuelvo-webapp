"use client";

import { X } from "lucide-react";

export interface JobRequestPanelInfo {
  title: string;
  description: string;
  providerName?: string;
  providerSurname?: string;
}

interface JobRequestPanelProps {
  jobRequest: JobRequestPanelInfo;
  onClose: () => void;
}

export default function JobRequestPanel({ jobRequest, onClose }: JobRequestPanelProps) {
  const initials = jobRequest.providerName
    ? jobRequest.providerName.charAt(0).toUpperCase()
    : "P";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-request-panel-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[580px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2
            id="job-request-panel-title"
            className="text-lg font-semibold text-brand-primary"
          >
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
              <span className="text-lg font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0 flex items-center h-16">
              {jobRequest.providerName && (
                <p className="text-[18px] font-semibold text-slate-800">
                  {jobRequest.providerName} {jobRequest.providerSurname}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[24px] font-bold text-brand-primary leading-tight">
              {jobRequest.title}
            </h3>

            {jobRequest.description && (
              <div className="pt-2 space-y-1">
                <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                  Descripción
                </span>
                <p className="text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                  {jobRequest.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
