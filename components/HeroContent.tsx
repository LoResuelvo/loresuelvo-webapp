import { BadgeCheck } from "lucide-react";

// Place to put the brand value
export default function HeroContent() {
  return (
    <div className="flex-1 space-y-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F8F5] px-3 py-1 text-sm font-semibold text-[#1F8A70]">
        <BadgeCheck size={16} />
        Profesionales verificados
      </div>
      <h2 className="text-4xl md:text-5xl font-bold text-[#1A2B48] leading-tight tracking-tight">
        Soluciones profesionales<br/>para tu hogar
      </h2>
      <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
        Conecta al instante con expertos certificados para reparar, mejorar o mantener tu hogar.
      </p>
    </div>
  );
}
