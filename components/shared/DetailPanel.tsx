import { ReactNode } from "react";

interface DetailPanelProps {
  /** Iniciales para el avatar circular */
  initials: string;
  /** Nombre a mostrar junto al avatar */
  name: string;
  /** Contenido adicional debajo del nombre (location, date, etc.) */
  nameExtra?: ReactNode;
  /** Título principal del detalle */
  title: string;
  /** Label encima de la descripción (ej: "Descripción") */
  descriptionLabel?: string;
  /** Texto de la descripción */
  description?: string;
}

export function DetailPanel({
  initials,
  name,
  nameExtra,
  title,
  descriptionLabel,
  description,
}: DetailPanelProps) {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-neutral text-brand-secondary shrink-0">
          <span className="text-lg font-semibold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-[18px] font-semibold text-slate-800">{name}</p>
          {nameExtra}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[24px] font-bold text-brand-primary leading-tight">
          {title}
        </h3>

        {description && (
          <div className="pt-2 space-y-1">
            {descriptionLabel && (
              <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                {descriptionLabel}
              </span>
            )}
            <p className="text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
