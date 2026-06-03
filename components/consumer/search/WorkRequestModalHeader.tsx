import { X } from "lucide-react";

interface WorkRequestModalHeaderProps {
  onClose: () => void;
}

export function WorkRequestModalHeader({ onClose }: WorkRequestModalHeaderProps) {
  return (
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
  );
}
