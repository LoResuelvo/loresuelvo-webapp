"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProviderWorkRequest } from "@/domain/provider/types";
import RequestDetailModal from "./RequestDetailModal";
import { acceptJobRequest } from "@/app/prestador/home/actions";
import { getConversationDetail } from "@/app/prestador/mensajes/actions";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { MapPin, Timer, User } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

interface WorkRequestsSectionProps {
  requests: ProviderWorkRequest[];
}

export default function WorkRequestsSection({ requests: initialRequests }: WorkRequestsSectionProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<ProviderWorkRequest | null>(null);
  const [, startTransition] = useTransition();

  const handleAccept = (requestId: string, conversationId: string) => {
    startTransition(async () => {
      await acceptJobRequest(requestId);
      const conversation = await getConversationDetail(conversationId);
      const consumerId = conversation.counterpart.id;
      router.push(`${ROUTES.provider.messages}?consumer_id=${consumerId}`);
    });
  };

  const handleReject = (requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setSelectedRequest(null);
  };

  return (
    <>
      <section
        role="region"
        aria-labelledby="work-requests-title"
        aria-label={t.providerHome.workRequestsSection.ariaLabel}
        className="max-w-4xl"
      >
        <div className="mb-5">
          <h1
            id="work-requests-title"
            className="text-[26px] font-bold text-brand-primary"
          >
            {t.providerHome.workRequestsSection.title}
          </h1>
        </div>

        {requests.length === 0 ? (
          <p className="text-[16px] text-slate-500 text-center py-8">{t.providerHome.workRequestsSection.emptyState}</p>
        ) : (
          <ul
            aria-label={t.providerHome.workRequestsSection.listLabel}
            className="flex flex-col gap-4"
          >
            {requests.map((request) => (
              <li
                key={request.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
              >
                <article className="flex items-center gap-4 relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-neutral text-brand-secondary shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-3 flex-1 pr-[140px]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p
                          // Note: data-field is used exclusively for Cucumber E2E tests
                           data-field="client-name"
                          className="text-[14px] font-semibold text-brand-secondary"
                        >
                          {request.clientName}
                        </p>
                        <h2
                           data-field="problem-title"
                          className="mt-1 text-[18px] font-bold text-brand-primary"
                        >
                          {request.problemTitle}
                        </h2>
                      </div>
                    </div>

                    <p
                      data-field="description"
                      className="text-[14px] leading-6 text-slate-600"
                    >
                      {request.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <p
                        data-field="location"
                        className="flex items-center gap-1.5 text-[14px] font-medium text-slate-600"
                      >
                        <MapPin className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
                        {request.location}
                      </p>
                    </div>
                  </div>

                  <div data-field="published-at" className="absolute right-4 top-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                    <Timer className="h-4 w-4" aria-hidden="true" />
                    {request.publishedAtLabel}
                  </div>

                  <div className="flex items-center justify-center min-w-[120px]">
                    <Button
                      type="button"
                      className="bg-brand-secondary hover:bg-brand-secondary/80 text-white rounded-lg px-4 h-auto py-2 text-[14px] font-medium transition-colors"
                      onClick={() => setSelectedRequest(request)}
                    >
                      {t.providerHome.workRequestsSection.viewDetails}
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAccept={(requestId) => handleAccept(requestId, selectedRequest.conversationId)}
          onReject={handleReject}
        />
      )}
    </>
  );
}