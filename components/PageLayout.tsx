import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-neutral flex flex-col font-sans text-brand-primary">
      <Header />
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
