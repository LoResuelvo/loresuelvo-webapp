import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiDiagnosisChat from "@/components/consumidor/diagnosis/AiDiagnosisChat";
import { AssistantClient } from "@/lib/diagnosis/assistant-client";

const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

const ASSISTANT_REPLY =
  "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?";
const USER_MESSAGE = "Se está filtrando agua debajo de la bacha";

function instantClient(): AssistantClient {
  return { async requestReply() { return ASSISTANT_REPLY; } };
}

function delayedClient(delayMs: number): AssistantClient {
  return {
    async requestReply(userMessage: string) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return userMessage ? ASSISTANT_REPLY : "";
    },
  };
}

describe("AiDiagnosisChat", () => {
  it("muestra el mensaje inicial del usuario recibido por query param", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    render(<AiDiagnosisChat client={instantClient()} />);

    expect(screen.getByText(USER_MESSAGE)).toBeInTheDocument();
  });

  it("no muestra la respuesta del asistente antes de que termine el procesamiento", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    render(<AiDiagnosisChat client={delayedClient(5000)} />);

    expect(screen.queryByText(ASSISTANT_REPLY)).not.toBeInTheDocument();
  });

  it("muestra la respuesta del asistente una vez procesada", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    render(<AiDiagnosisChat client={instantClient()} />);

    await waitFor(() => {
      expect(screen.getByText(ASSISTANT_REPLY)).toBeInTheDocument();
    });
  });

  it("alinea el mensaje del usuario a la derecha y el del asistente a la izquierda", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    const { container } = render(<AiDiagnosisChat client={instantClient()} />);

    await waitFor(() => {
      const ownRow = container.querySelector('[data-testid="message-bubble-msg-user-1"]')?.parentElement;
      const assistantRow = container.querySelector('[data-testid="message-bubble-msg-assistant-1"]')?.parentElement;
      expect(ownRow).toHaveClass("justify-end");
      expect(assistantRow).toHaveClass("justify-start");
    });
  });

  it("no muestra conversación cuando no hay mensaje en la URL", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    render(<AiDiagnosisChat client={instantClient()} />);

    expect(screen.queryByText(USER_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(ASSISTANT_REPLY)).not.toBeInTheDocument();
  });
});
