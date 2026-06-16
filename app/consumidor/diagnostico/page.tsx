import { Suspense } from "react";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";

export default function ConsumerDiagnosisPage() {
  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <div className="flex-1 flex flex-col min-w-0">
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
