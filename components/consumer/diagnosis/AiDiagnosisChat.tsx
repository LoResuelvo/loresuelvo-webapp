"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { ImagePreviewModal } from "@/components/messaging/media/ImagePreviewModal";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import { useAiDiagnosisChat } from "./useAiDiagnosisChat";
import { AiChatHeader } from "./AiChatHeader";
import { AiChatMessagesArea } from "./AiChatMessagesArea";
import { AiChatInputArea } from "./AiChatInputArea";
import { cn } from "@/lib/utils";

interface AiDiagnosisChatProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  conversationId?: string | null;
  className?: string;
  jobRequestFn?: (conversationId: string, providerId: number) => Promise<unknown>;
}

export default function AiDiagnosisChat({
  client,
  chatRepository,
  simulateError = false,
  conversationId,
  className,
  jobRequestFn,
}: AiDiagnosisChatProps = {}) {
  const router = useRouter();

  const {
    messages,
    chatError,
    messageInput,
    setMessageInput,
    attachedFiles,
    previewImage,
    setPreviewImage,
    uploadError,
    isSending,
    isInitialized,
    isWaitingForReply,
    isLoadingMessages,
    fileInputRef,
    handleRetry,
    handleFileChange,
    handleRemoveFile,
    handleSendMessage,
    handleContactProvider,
    USER_ID,
  } = useAiDiagnosisChat({ client, chatRepository, simulateError, conversationId, jobRequestFn });

  const isProcessing = isWaitingForReply && chatError === null;
  const isInputDisabled = isProcessing || isSending;

  const handleBackToList = useCallback(() => {
    router.push(ROUTES.consumer.aiMessages);
  }, [router]);

  return (
    <section
      role="region"
      aria-label="Chat con el asistente de diagnóstico"
      className={cn("flex-1 flex flex-col bg-brand-neutral/30 min-h-0", className)}
    >
      <AiChatHeader onBack={handleBackToList} />

      <AiChatMessagesArea
        messages={messages}
        userId={USER_ID}
        isInitialized={isInitialized}
        isLoadingMessages={isLoadingMessages}
        isProcessing={isProcessing}
        chatError={chatError}
        onRetry={handleRetry}
        onContactProvider={handleContactProvider}
      />

      <AiChatInputArea
        value={messageInput}
        onChange={setMessageInput}
        onSend={handleSendMessage}
        attachedFiles={attachedFiles}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        onPreviewImage={setPreviewImage}
        disabled={isInputDisabled}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
      />

      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `Vista previa de imagen ${previewImage.name}` : ""}
      />
    </section>
  );
}
