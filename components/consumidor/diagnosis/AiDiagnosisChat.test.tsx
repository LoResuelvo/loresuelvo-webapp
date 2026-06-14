import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

interface ManualHandle {
  resolve: (reply: string) => void;
  reject: (error: Error) => void;
}

function manualClient(): { client: AssistantClient; handle: ManualHandle } {
  const handle: ManualHandle = { resolve: () => undefined, reject: () => undefined };
  const client: AssistantClient = {
    async requestReply() {
      return new Promise<string>((resolve, reject) => {
        handle.resolve = resolve;
        handle.reject = reject;
      });
    },
  };
  return { client, handle };
}

function failingClient(error: Error = new Error("Servicio no disponible")): AssistantClient {
  return {
    async requestReply() {
      throw error;
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

  it("muestra un indicador de carga mientras la respuesta está en procesamiento", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    const { client } = manualClient();
    render(<AiDiagnosisChat client={client} />);

    expect(screen.getByRole("status", { name: /asistente escribiendo/i })).toBeInTheDocument();
  });

  it("deshabilita el input y el botón de enviar mientras hay respuesta en procesamiento", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    const { client } = manualClient();
    render(<AiDiagnosisChat client={client} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    const sendButton = screen.getByRole("button", { name: /enviar mensaje/i });
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it("rehabilita el input cuando la respuesta llega", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    const { client, handle } = manualClient();
    render(<AiDiagnosisChat client={client} />);

    expect(screen.getByPlaceholderText(/escribe un mensaje/i)).toBeDisabled();

    handle.resolve(ASSISTANT_REPLY);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/escribe un mensaje/i)).not.toBeDisabled();
    });
  });

  it("muestra un mensaje de error cuando el servicio falla", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    render(<AiDiagnosisChat client={failingClient()} />);

    await waitFor(() => {
      expect(
        screen.getByText("No pudimos obtener una respuesta en este momento"),
      ).toBeInTheDocument();
    });
  });

  it("muestra un botón para reintentar cuando el servicio falla", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    render(<AiDiagnosisChat client={failingClient()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    });
  });

  it("vuelve a invocar al cliente al reintentar tras un error", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: USER_MESSAGE }),
    );

    const requestReply = vi.fn()
      .mockRejectedValueOnce(new Error("Servicio no disponible"))
      .mockResolvedValueOnce(ASSISTANT_REPLY);

    const client: AssistantClient = { requestReply };

    render(<AiDiagnosisChat client={client} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    });

    expect(requestReply).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    await waitFor(() => {
      expect(requestReply).toHaveBeenCalledTimes(2);
      expect(screen.getByText(ASSISTANT_REPLY)).toBeInTheDocument();
    });
  });
});
