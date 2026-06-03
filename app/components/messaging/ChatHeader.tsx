import { User } from "lucide-react";

interface ChatHeaderProps {
  providerName: string;
  providerSurname: string;
  pending: boolean;
  onAccept?: () => void;
}

export default function ChatHeader({ providerName, providerSurname, pending, onAccept }: ChatHeaderProps) {
  return (
    <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4 flex-shrink-0">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
        <User className="w-5 h-5 text-slate-400" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-brand-primary">
          {providerName} {providerSurname}
        </p>
        {pending && (
          <p className="text-[11px] text-amber-600">Esperando aceptación</p>
        )}
      </div>
      {pending && onAccept && (
        <button
          onClick={onAccept}
          className="px-4 py-2 bg-green-600 text-white text-[14px] font-semibold rounded-lg hover:bg-green-700 transition-colors"
        >
          Aceptar Solicitud
        </button>
      )}
    </div>
  );
}