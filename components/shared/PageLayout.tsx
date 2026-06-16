import { ReactNode } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { getAuthService } from "@/infrastructure/auth";

export async function PageLayout({ children }: { children: ReactNode }) {
  const session = await getAuthService().getSession();

  return (
    <div className="min-h-screen bg-brand-neutral flex flex-col font-sans text-brand-primary">
      <Header user={session?.user} />
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
