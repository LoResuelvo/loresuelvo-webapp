import { MessageCircle, User, ArrowRight } from "lucide-react";
import { Provider } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";

interface ProviderCardProps {
  provider: Provider;
  onContact?: (provider: Provider) => void;
}

export default function ProviderCard({ provider, onContact }: ProviderCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex gap-5 items-center relative group">
      <div className="w-[80px] h-[80px] rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200/50 flex-shrink-0 select-none overflow-hidden relative">
        {provider.profile_photo_url ? (
          <img
            src={provider.profile_photo_url}
            alt={`Foto de ${provider.name}`}
            className="w-full h-full object-cover"
            data-testid="provider-profile-photo"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-slate-400/25 flex items-center justify-center border-4 border-white shadow-inner">
            <User className="w-7 h-7 text-slate-500/70" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[18px] font-bold text-brand-primary truncate leading-tight group-hover:text-brand-secondary transition-colors flex items-center gap-2">
              <span>{provider.name} {provider.surname}</span>
            </h4>

            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={provider.rating} />
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

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Button
              type="button"
              onClick={() => onContact?.(provider)}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm font-semibold text-[13px]"
            >
              <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              Contactar
            </Button>

            <Button
              variant="link"
              type="button"
              className="text-brand-secondary font-bold text-[13px] p-0 h-auto flex items-center gap-0.5 group/link"
            >
              Ver perfil
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}