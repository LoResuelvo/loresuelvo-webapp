import { Provider } from "@/domain/provider/types";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface ProviderMiniProfileProps {
  provider: Provider;
  className?: string;
}

export function ProviderMiniProfile({ provider, className }: ProviderMiniProfileProps) {
  const initials = provider.name ? provider.name.charAt(0).toUpperCase() : "";

  return (
    <div className={cn("bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3", className)}>
      <Avatar
        src={provider.profilePhotoUrl}
        alt={`${t.consumerSearch.providerCard.photoAlt} ${provider.name}`}
        size="sm"
        initials={initials}
        className="bg-slate-200 border-slate-300/35"
      />
      <div>
        <h5 className="font-bold text-brand-primary text-[14px]">
          {provider.name} {provider.surname}
        </h5>
        <p className="text-[13px] text-slate-500 font-medium">
          Categoría: {provider.categoryName}
        </p>
      </div>
    </div>
  );
}
