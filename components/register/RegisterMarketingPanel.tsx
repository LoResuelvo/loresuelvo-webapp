import { BadgeCheck, Bot } from "lucide-react";

const PANEL_BACKGROUND = "#1A2B48";
const PANEL_DOT_COLOR = "#2A4268";

export function RegisterMarketingPanel() {
  return (
    <aside
      aria-label="Lo Resuelvo - Marketing Panel"
      className="relative hidden min-h-[600px] flex-col justify-start overflow-hidden p-8 md:flex"
      style={{ backgroundColor: PANEL_BACKGROUND }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${PANEL_DOT_COLOR} 1.5px, transparent 1.5px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
          <BadgeCheck className="size-3.5" aria-hidden="true" color="green" />
          Profesionales Verificados
        </div>

        <h2 className="text-3xl font-semibold leading-tight text-white">
          La forma más inteligente de cuidar tu hogar.
        </h2>

        <p className="text-lg text-white/80">
          Únete a la comunidad líder en servicios residenciales de alta gama y
          gestiona todo desde un solo lugar.
        </p>
      </div>

      <div className="relative z-10 mt-4 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-teal-700">
            <Bot className="size-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">IA Concierge</p>
            <p className="text-xs text-white/70">
              Te ayudamos a encontrar al pro ideal en segundos.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
