import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AiChatMessagesArea } from "./AiChatMessagesArea";
import { t } from "@/infrastructure/i18n/translations";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";

describe("AiChatMessagesArea", () => {
  const userId = "consumer-ai-diagnosis";

  it("renders disclaimer banner and empty state when there are no messages", () => {
    render(
      <AiChatMessagesArea
        messages={[]}
        userId={userId}
        isInitialized={true}
        isLoadingMessages={false}
      />
    );

    expect(screen.getByText(t.aiDiagnosis.disclaimer)).toBeInTheDocument();
    expect(screen.getByText(t.aiDiagnosis.chatTitle)).toBeInTheDocument();
    expect(screen.getByText(t.aiDiagnosis.chatDescription)).toBeInTheDocument();
  });

  it("renders loading indicator when isLoadingMessages is true and messages is empty", () => {
    render(
      <AiChatMessagesArea
        messages={[]}
        userId={userId}
        isInitialized={true}
        isLoadingMessages={true}
      />
    );

    expect(screen.getByText(t.aiDiagnosis.loadingMessages)).toBeInTheDocument();
  });

  it("renders message bubbles correctly", () => {
    const messages: AiMessage[] = [
      {
        id: "msg-1",
        content: "Hola, tengo una fuga",
        senderId: userId,
        sentAt: "10:00",
      },
      {
        id: "msg-2",
        content: "Entendido, ¿dónde está la fuga?",
        senderId: "assistant-ai-diagnosis",
        sentAt: "10:01",
      },
    ];

    render(
      <AiChatMessagesArea
        messages={messages}
        userId={userId}
      />
    );

    expect(screen.getByText("Hola, tengo una fuga")).toBeInTheDocument();
    expect(screen.getByText("Entendido, ¿dónde está la fuga?")).toBeInTheDocument();
  });

  it("renders typing indicator when isProcessing is true", () => {
    render(
      <AiChatMessagesArea
        messages={[]}
        userId={userId}
        isProcessing={true}
      />
    );

    expect(screen.getByRole("status", { name: /asistente escribiendo/i })).toBeInTheDocument();
    expect(screen.getByText(t.aiDiagnosis.assistantTyping)).toBeInTheDocument();
  });

  it("renders error alert with retry button when chatError is set", () => {
    const handleRetry = vi.fn();
    render(
      <AiChatMessagesArea
        messages={[]}
        userId={userId}
        chatError="Error al conectar con el asistente"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error al conectar con el asistente")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: t.aiDiagnosis.retry });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
