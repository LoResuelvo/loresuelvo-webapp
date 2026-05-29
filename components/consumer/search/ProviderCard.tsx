import { Star, User, ArrowRight } from "lucide-react";
import { Provider } from "@/lib/api/types";

interface ProviderCardProps {
  provider: Provider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex gap-5 items-center relative group">
      <div className="w-[80px] h-[80px] rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200/50 flex-shrink-0 select-none overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-slate-400/25 flex items-center justify-center border-4 border-white shadow-inner">
          <User className="w-7 h-7 text-slate-500/70" />
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[18px] font-bold text-brand-primary truncate leading-tight group-hover:text-brand-secondary transition-colors">
              {provider.name} {provider.surname}
            </h4>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 fill-current ${
                      provider.rating && i < Math.floor(provider.rating)
                        ? "text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[12px] font-bold text-slate-700 leading-none">
                {provider.rating !== undefined ? provider.rating : ""}
              </span>
              <span className="text-[12px] text-slate-400 leading-none">
                ({provider.reviews ?? 0} reseñas) | {provider.jobs ?? 0} trabajos
              </span>
            </div>

            {provider.description && (
              <p className="text-[13px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {provider.description}
              </p>
            )}
          </div>

          <button
            type="button"
            className="text-brand-secondary font-bold text-[13px] hover:underline flex items-center gap-0.5 flex-shrink-0"
          >
            Ver perfil
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}