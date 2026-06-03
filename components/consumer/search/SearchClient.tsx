"use client";

import { useState } from "react";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import { AuthSession } from "@/lib/auth/types";
import { Category, Provider } from "@/lib/api/types";
import CategoryHeader from "./CategoryHeader";
import EmptyState from "./EmptyState";
import ProviderCard from "./ProviderCard";
import WorkRequestModal from "./WorkRequestModal";

interface SearchClientProps {
  session: AuthSession | null;
  providers: Provider[];
  selectedCategory: Category | null;
}

export default function SearchClient({
  session,
  providers,
  selectedCategory,
}: SearchClientProps) {
  const categoryName = selectedCategory?.name || "Búsqueda";
  const [contactingProvider, setContactingProvider] = useState<Provider | null>(null);

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        
        <main className="flex-1 p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            
            <CategoryHeader categoryName={categoryName} />

            {providers.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-6">
                {providers.map((provider) => {
                  return (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      onContact={(p) => setContactingProvider(p)}
                    />
                  );
                })}
              </div>
            )}

          </div>
        </main>
      </div>

      {contactingProvider && (
        <WorkRequestModal
          provider={contactingProvider}
          onClose={() => setContactingProvider(null)}
        />
      )}
    </div>
  );
}
