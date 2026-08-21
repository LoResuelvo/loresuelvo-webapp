import { MessageCircle, User, ArrowRight } from "lucide-react";
import type { Provider as ProviderType } from "@/domain/provider/types";
import { Provider } from "@/domain/provider/Provider";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface ProviderCardProps {
  provider: ProviderType;
  className?: string;
  onContact?: (provider: ProviderType) => void;
}

export default function ProviderCard({ provider, className, onContact }: ProviderCardProps) {
  const displayName = Provider.getDisplayName(provider);
  const ratingSummary = Provider.getRatingSummary(provider);

  return (
    <div className={cn("provider-card bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex gap-5 items-center relative group", className)}>
      <div className="w-[80px] h-[80px] rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200/50 flex-shrink-0 select-none overflow-hidden relative">
        {provider.profilePhotoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={provider.profilePhotoUrl}
            alt={`${t.consumerSearch.providerCard.photoAlt} ${displayName}`}
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
            <h4 className="text-subtitle font-bold text-brand-primary truncate leading-tight group-hover:text-brand-secondary transition-colors flex items-center gap-2">
              <span>{displayName}</span>
            </h4>

            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={provider.rating} />
              <span className="text-small font-bold text-slate-700 leading-none">
                {ratingSummary.hasReviews ? ratingSummary.formattedRating : (provider.rating !== undefined ? provider.rating : "")}
              </span>
              <span className="text-small text-slate-400 leading-none">
                ({provider.reviews ?? 0} {t.consumerSearch.providerCard.reviews}) | {provider.jobs ?? 0} {t.consumerSearch.providerCard.jobs}
              </span>
            </div>

            {provider.description && (
              <p className="text-small text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                {provider.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Button
              variant="brand"
              type="button"
              onClick={() => onContact?.(provider)}
              className="shadow-sm font-semibold text-small"
            >
              <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              {t.consumerSearch.contactBtn}
            </Button>

            <Button
              variant="link"
              type="button"
              className="text-brand-secondary font-bold text-small p-0 h-auto flex items-center gap-0.5 group/link"
            >
              {t.consumerSearch.profileBtn}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}