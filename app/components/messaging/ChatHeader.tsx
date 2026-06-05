import { User, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface JobRequestInfo {
  title: string;
  description: string;
}

interface ChatHeaderProps {
  providerName: string;
  providerSurname: string;
  pending: boolean;
  jobRequest?: JobRequestInfo | null;
  onAccept?: () => void;
}

export default function ChatHeader({ providerName, providerSurname, pending, jobRequest, onAccept }: ChatHeaderProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-200 bg-white flex-shrink-0">
      <div className="h-16 flex items-center px-6 gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <User className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-primary truncate">
            {providerName} {providerSurname}
          </p>
          {pending && (
            <p className="text-[11px] text-amber-600">Esperando aceptación</p>
          )}
        </div>

        {jobRequest && (
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            aria-expanded={expanded}
            aria-label="Ver solicitud de trabajo"
          >
            <FileText className="w-4 h-4" />
            Solicitud
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {pending && onAccept && (
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-green-600 text-white text-[14px] font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Aceptar Solicitud
          </button>
        )}
      </div>

      {jobRequest && expanded && (
        <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                Solicitud de Trabajo
              </p>
              <p className="font-semibold text-brand-primary text-[14px] leading-tight">
                {jobRequest.title}
              </p>
              {jobRequest.description && (
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  {jobRequest.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}