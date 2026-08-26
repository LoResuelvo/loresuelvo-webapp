import { MessageCircle, User, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import type { Provider as ProviderType } from "@/domain/provider/types";
import { Provider } from "@/domain/provider/Provider";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface ProviderCardProps {
  provider: ProviderType;
  className?: string;
  onContact?: (provider: ProviderType) => void;
}

export default function ProviderCard({ provider, className, onContact }: ProviderCardProps) {
  const displayName = Provider.getDisplayName(provider);
  const ratingSummary = Provider.getRatingSummary(provider);
  const reviewCount = provider.reviews ?? 0;
  const reviewLabel = reviewCount === 1 ? t.consumerSearch.providerCard.review : t.consumerSearch.providerCard.reviews;
  const hasReviews = ratingSummary.hasReviews;

  return (
    <div
      className={cn(
        "provider-card bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between relative group",
        className
      )}
    >
      <div className="flex gap-4 sm:gap-5 items-center min-w-0 flex-1">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200/60 flex-shrink-0 select-none overflow-hidden relative shadow-inner">
          {provider.profilePhotoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={provider.profilePhotoUrl}
              alt={`${t.consumerSearch.providerCard.photoAlt} ${displayName}`}
              className="w-full h-full object-cover"
              data-testid="provider-profile-photo"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
              <User className="w-6 h-6 text-slate-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-subtitle font-bold text-brand-primary truncate leading-tight group-hover:text-brand-secondary transition-colors">
            <span>{displayName}</span>
          </h4>

          {hasReviews ? (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <RatingStars rating={provider.rating} />
              <span className="text-small font-bold text-slate-700 leading-none">
                {ratingSummary.formattedRating}
              </span>
              <span className="text-small text-slate-400 leading-none">
                ({reviewCount} {reviewLabel})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1.5 text-small">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="font-medium text-slate-600">
                {t.consumerSearch.providerCard.noReviews || "Sin calificaciones aún"}
              </span>
              <span className="text-slate-400">
                ({reviewCount} {reviewLabel})
              </span>
            </div>
          )}

          {provider.description && (
            <p className="text-small text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {provider.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
        <Button
          variant="brand"
          type="button"
          onClick={() => onContact?.(provider)}
          className="shadow-sm font-semibold text-small h-9 px-4 w-full sm:w-auto"
        >
          <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
          {t.consumerSearch.contactBtn}
        </Button>

        <Button
          asChild
          variant="link"
          className="text-brand-secondary font-bold text-small p-0 h-auto flex items-center gap-0.5 group/link whitespace-nowrap"
        >
          <Link
            href={ROUTES.consumer.providerProfile(provider.id)}
            aria-label={`${t.consumerSearch.profileBtn} ${displayName}`}
          >
            {t.consumerSearch.profileBtn}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
