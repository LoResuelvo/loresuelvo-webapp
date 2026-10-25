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
import { useResourceUpdate } from "@/infrastructure/notifications/NotificationContext";

interface WorkRequestsSectionProps {
  requests: ProviderWorkRequest[];
}

export default function WorkRequestsSection({ requests: initialRequests }: WorkRequestsSectionProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<ProviderWorkRequest | null>(null);
  const [, startTransition] = useTransition();

  useResourceUpdate("job_request", undefined, (_event, jobRequest) => {
    if (jobRequest) {
      setRequests((prev) => {
        const idStr = String(jobRequest.id);
        if (prev.some((r) => r.id === idStr)) return prev;
        const newRequest: ProviderWorkRequest = {
          id: idStr,
          conversationId: String(jobRequest.conversationId),
          clientName: `${jobRequest.requester.name} ${jobRequest.requester.surname}`.trim(),
          problemTitle: jobRequest.title,
          category: "",
          description: jobRequest.description,
          location: "",
          publishedAtLabel: t.providerHome.workRequestsSection.justReceivedLabel,
          unreadMessagesCount: 0,
          images: jobRequest.images.map((img) => ({
            id: String(img.id),
            url: img.url,
            originalName: img.originalName,
          })),
        };
        return [newRequest, ...prev];
      });
    }
  });

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
        className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      >
        <div className="mb-5 border-b border-slate-100 pb-5">
          <h2
            id="work-requests-title"
            className="font-heading text-xl font-semibold text-brand-primary"
          >
            {t.providerHome.workRequestsSection.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.providerHome.overview.requestsDescription}</p>
        </div>

        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm leading-relaxed text-slate-500">{t.providerHome.workRequestsSection.emptyState}</p>
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
