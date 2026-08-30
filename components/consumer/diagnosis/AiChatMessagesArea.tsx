"use client";

import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import MessageBubble from "@/components/messaging/chat/MessageBubble";
import InfoBanner from "@/components/messaging/InfoBanner";
import { Button } from "@/components/ui/button";
import { RecommendedProvidersList } from "./RecommendedProvidersList";
import { t } from "@/infrastructure/i18n/translations";
import { useSmartScroll } from "@/hooks/useSmartScroll";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import { cn } from "@/lib/utils";

export interface AiChatMessagesAreaProps {
  messages: AiMessage[];
  userId: string;
  isInitialized?: boolean;
  isLoadingMessages?: boolean;
  isProcessing?: boolean;
  chatError?: string | null;
  onRetry?: () => void;
  onContactProvider?: (providerId: number) => Promise<void>;
  className?: string;
}

export function AiChatMessagesArea({
  messages,
  userId,
  isInitialized = true,
  isLoadingMessages = false,
  isProcessing = false,
  chatError = null,
  onRetry,
  onContactProvider,
  className,
}: AiChatMessagesAreaProps) {
  const { containerRef, endRef } = useSmartScroll([messages, isProcessing, chatError]);

  return (
    <div
      ref={containerRef}
      className={cn("flex-1 p-6 overflow-y-auto flex flex-col gap-4 relative", className)}
    >
      <InfoBanner tone="info">
        {t.aiDiagnosis.disclaimer}
      </InfoBanner>

      {!isInitialized ? null : messages.length === 0 && isLoadingMessages ? (
        <div className="flex flex-1 items-center justify-center text-center mt-4" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" aria-hidden="true" />
            <p className="text-body text-slate-500">{t.aiDiagnosis.loadingMessages}</p>
          </div>
        </div>
      ) : !isInitialized || messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center mt-4">
          <div>
            <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-title font-bold text-brand-primary">
              {t.aiDiagnosis.chatTitle}
            </h1>
            <p className="mt-2 text-body text-slate-500">
              {t.aiDiagnosis.chatDescription}
            </p>
          </div>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-4">
            <MessageBubble
              id={msg.id}
              content={msg.content}
              sentAt={msg.sentAt}
              isExpanded={false}
              showExpandButton={false}
              onToggleExpand={() => undefined}
              isOwnMessage={msg.senderId === userId}
              images={msg.images}
            />
            {(msg.diagnosisCompleted || msg.assessment) && onContactProvider && (
              <div className="mt-0 mb-0 w-full max-w-2xl self-start">
                <RecommendedProvidersList
                  providers={msg.recommendedProviders}
                  diagnosisCompleted={msg.diagnosisCompleted}
                  assessment={msg.assessment}
                  onContactProvider={onContactProvider}
                  className="mt-0"
                />
              </div>
            )}
          </div>
        ))
      )}

      {isProcessing && (
        <div
          role="status"
          aria-label="Asistente escribiendo"
          className="flex justify-start"
        >
          <div className="rounded-2xl bg-white border border-slate-200 rounded-tl-sm px-4 py-3 flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span className="text-small">{t.aiDiagnosis.assistantTyping}</span>
          </div>
        </div>
      )}

      {chatError !== null && (
        <div
          role="alert"
          className="flex justify-start"
        >
          <div className="rounded-2xl bg-red-50 border border-red-200 rounded-tl-sm px-4 py-3 flex flex-col gap-2 max-w-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span className="text-body font-medium">{chatError}</span>
            </div>
            {onRetry && (
              <Button
                variant="link"
                type="button"
                onClick={onRetry}
                className="self-start text-small font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 p-0 h-auto"
              >
                {t.aiDiagnosis.retry}
              </Button>
            )}
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
