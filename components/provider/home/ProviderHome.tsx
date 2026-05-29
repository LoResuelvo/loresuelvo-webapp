import { AuthSession } from "@/lib/auth/types";
import { ProviderWorkRequest } from "@/lib/provider-home/types";
import ProviderSidebar from "./ProviderSidebar";
import WorkRequestsSection from "./WorkRequestsSection";

interface ProviderHomeProps {
  session: AuthSession | null;
  workRequests: ProviderWorkRequest[];
}

export default function ProviderHome({ session, workRequests }: ProviderHomeProps) {
  const userInitial = session?.user?.firstName?.charAt(0).toUpperCase() ?? "";
  const userFullName = [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <ProviderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-slate-200 bg-brand-neutral/30 flex items-center justify-end gap-3 px-8 sticky top-0 z-10">
          {userFullName && (
            <span className="text-sm font-semibold text-brand-primary truncate max-w-52">
              {userFullName}
            </span>
          )}
          <div
            aria-label="Usuario prestador"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0"
          >
            {userInitial ? (
              <span className="text-[14px] font-bold text-slate-600">{userInitial}</span>
            ) : (
              <span className="text-[14px] font-bold text-slate-400">P</span>
            )}
          </div>
        </header>
        <main className="flex-1 p-8 lg:p-10">
          <div className="max-w-6xl w-full">
            <WorkRequestsSection requests={workRequests} />
          </div>
        </main>
      </div>
    </div>
  );
}
