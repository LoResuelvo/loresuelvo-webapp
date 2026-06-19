import { render, screen, waitFor, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import { AssistantClient } from "@/ports/assistant-client";

const ASSISTANT_REPLY =
  "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?";
const USER_MESSAGE = "Se está filtrando agua debajo de la bacha";
const DISCLAIMER_TEXT =
  "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo";

const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage.data[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockLocalStorage.data[key]; }),
};

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

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
  beforeEach(() => {
    mockLocalStorage.data = {};
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
    mockLocalStorage.data = {};
  });

  it("muestra el aviso de orientación preliminar", () => {
    render(<AiDiagnosisChat client={instantClient()} />);
    expect(screen.getByText(DISCLAIMER_TEXT)).toBeInTheDocument();
  });

  it("no muestra mensajes cuando localStorage está vacío", () => {
    render(<AiDiagnosisChat client={instantClient()} />);
    expect(screen.queryByText(USER_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(ASSISTANT_REPLY)).not.toBeInTheDocument();
  });

  it("carga mensajes desde localStorage al montar", async () => {
    render(<AiDiagnosisChat client={instantClient()} />);
    expect(screen.queryByText(USER_MESSAGE)).not.toBeInTheDocument();
  });

  it("guarda el mensaje del usuario al enviar", async () => {
    render(<AiDiagnosisChat client={instantClient()} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(screen.getByText(USER_MESSAGE)).toBeInTheDocument();
    });
  });

  it("muestra respuesta del asistente tras procesar", async () => {
    render(<AiDiagnosisChat client={instantClient()} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(screen.getByText(ASSISTANT_REPLY)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("muestra indicador de carga mientras procesa", async () => {
    const { client } = manualClient();
    render(<AiDiagnosisChat client={client} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));
    });

    expect(screen.getByRole("status", { name: /asistente escribiendo/i })).toBeInTheDocument();
  });

  it("deshabilita input durante procesamiento", async () => {
    render(<AiDiagnosisChat client={delayedClient(2000)} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(screen.getByPlaceholderText(/escribe un mensaje/i)).toBeDisabled();
  });

  it("rehabilita input cuando llega respuesta", async () => {
    const { client, handle } = manualClient();
    render(<AiDiagnosisChat client={client} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    await act(async () => {
      handle.resolve(ASSISTANT_REPLY);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/escribe un mensaje/i)).not.toBeDisabled();
    });
  });

  it("muestra mensaje de error cuando servicio falla", async () => {
    render(<AiDiagnosisChat client={failingClient()} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(screen.getByText("No pudimos obtener una respuesta en este momento")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("muestra botón reintentar tras error", async () => {
    render(<AiDiagnosisChat client={failingClient()} />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    fireEvent.change(input, { target: { value: USER_MESSAGE } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
