"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProviderWorkRequest } from "@/domain/provider/types";
import RequestDetailModal from "./RequestDetailModal";
import { acceptJobRequest } from "@/app/prestador/home/actions";
import { getConversationDetail } from "@/app/prestador/mensajes/actions";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

import WorkRequestCard from "./WorkRequestCard";

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
              <WorkRequestCard
                key={request.id}
                request={request}
                onViewDetails={() => setSelectedRequest(request)}
              />
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