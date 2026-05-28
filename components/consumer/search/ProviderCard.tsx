import { Star, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Provider } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

interface ProviderCardProps {
  provider: Provider;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex gap-5 items-start relative group">
      <div className="w-[100px] h-[100px] rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200/50 flex-shrink-0 select-none overflow-hidden relative">
        <div className="absolute inset-0 bg-slate-500/10 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-400/25 flex items-center justify-center border-4 border-white shadow-inner">
            <User className="w-8 h-8 text-slate-500/70" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between h-[100px]">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-[18px] font-bold text-brand-primary truncate leading-tight group-hover:text-brand-secondary transition-colors">
              {provider.name} {provider.surname}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
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
            <span className="text-[12px] font-bold text-slate-700 leading-none mt-0.5">
              {provider.rating !== undefined ? provider.rating : ""}
            </span>
            <span className="text-[12px] text-slate-400 leading-none mt-0.5">
              ({provider.reviews ?? 0} reseñas)
            </span>
          </div>

          {/* Short Description */}
          {provider.description && (
            <p className="text-[13px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {provider.description}
            </p>
          )}
        </div>

        {/* Bottom Stats & Action */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
          <span className="text-[12px] font-semibold text-slate-400">
            {provider.jobs !== undefined ? `${provider.jobs} trabajos realizados` : ""}
          </span>

          <Link
            href=''
            className="text-brand-secondary font-bold text-[13px] hover:underline flex items-center gap-0.5 group/link"
          >
            Ver perfil
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
