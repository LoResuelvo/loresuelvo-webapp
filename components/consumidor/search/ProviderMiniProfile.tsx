import { User } from "lucide-react";
import { Provider } from "@/lib/api/types";

interface ProviderMiniProfileProps {
  provider: Provider;
}

export function ProviderMiniProfile({ provider }: ProviderMiniProfileProps) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300/35">
        <User className="w-5 h-5 text-slate-500" />
      </div>
      <div>
        <h5 className="font-bold text-brand-primary text-[14px]">
          {provider.name} {provider.surname}
        </h5>
        <p className="text-[12px] text-slate-400">
          Categoría: {provider.category_name}
        </p>
      </div>
    </div>
  );
}
