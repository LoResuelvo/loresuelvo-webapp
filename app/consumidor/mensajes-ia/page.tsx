import { Suspense } from "react";
import Sidebar from "@/components/consumidor/Sidebar";
import ConsumerHeader from "@/components/consumidor/home/ConsumerHeader";
import AiDiagnosisChat from "@/components/consumidor/diagnosis/AiDiagnosisChat";
import { getAuthService } from "@/lib/auth";

export default async function ConsumerAiMessagesPage() {
  const session = await getAuthService().getSession();

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 p-8 lg:p-10 flex justify-center">
          <div className="max-w-3xl w-full">
            <Suspense fallback={null}>
              <AiDiagnosisChat />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
