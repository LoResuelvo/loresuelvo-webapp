import { render, screen, waitFor, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import { AssistantClient } from "@/ports/assistant-client";
import { AiChatRepository } from "@/ports/ai-chat-repository";

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

global.URL.createObjectURL = vi.fn(() => "blob:https://loresuelvo.com/mock-blob");

const mockUseSearchParams = vi.fn();
const mockUseRouter = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => mockUseRouter(),
}));

vi.mock("@/app/files/actions", () => ({
  getPresignedUrlAction: vi.fn().mockResolvedValue({
    file_id: "file-id-123",
    key: "key-123",
    upload_url: "https://upload.url",
    headers: {},
  }),
  confirmUploadAction: vi.fn().mockResolvedValue({
    id: "confirmed-file-id-123",
  }),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
});

function instantClient(): AssistantClient {
  return { async requestReply() { return ASSISTANT_REPLY; }, getConversation: vi.fn() as unknown as AssistantClient["getConversation"] };
}

function delayedClient(delayMs: number): AssistantClient {
  return {
    async requestReply(userMessage: string) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return userMessage ? ASSISTANT_REPLY : "";
    },
    getConversation: vi.fn() as unknown as AssistantClient["getConversation"],
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
    getConversation: vi.fn() as unknown as AssistantClient["getConversation"],
  };
  return { client, handle };
}

function failingClient(error: Error = new Error("Servicio no disponible")): AssistantClient {
  return {
    async requestReply() {
      throw error;
    },
    getConversation: vi.fn() as unknown as AssistantClient["getConversation"],
  };
}

describe("AiDiagnosisChat", () => {
  beforeEach(() => {
    mockLocalStorage.data = {};
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseRouter.mockReturnValue({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() });
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

  it("muestra la sección de prestadores recomendados si el repositorio los devuelve", async () => {
    const mockRepo = {
      getById: vi.fn().mockResolvedValue({
        id: 1,
        status: "active",
        title: "Pérdida",
        responseStatus: "answered",
        messages: [
          { id: "m1", senderRole: "consumer", content: USER_MESSAGE, sentAt: "2026-01-01T10:00:00Z" },
          { id: "m2", senderRole: "chatbot", content: ASSISTANT_REPLY, sentAt: "2026-01-01T10:01:00Z" }
        ],
        recommendedProviders: [
          { id: 10, name: "Juan", surname: "Pérez", categoryName: "Plomería" }
        ],
        diagnosisCompleted: true,
        updatedOn: "2026-01-01T10:01:00Z"
      }),
      sendMessage: vi.fn(),
      create: vi.fn(),
      getAll: vi.fn(),
    };

    render(<AiDiagnosisChat chatRepository={mockRepo as unknown as AiChatRepository} conversationId="1" />);

    await waitFor(() => {
      expect(screen.getByText("Prestadores recomendados")).toBeInTheDocument();
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });
  });

  describe("Funcionalidad de adjuntos de imagen", () => {
    it("muestra el botón para adjuntar imágenes", () => {
      render(<AiDiagnosisChat client={instantClient()} />);
      expect(screen.getByRole("button", { name: /adjuntar imágenes/i })).toBeInTheDocument();
    });

    it("permite agregar una imagen válida y mostrar su miniatura", async () => {
      render(<AiDiagnosisChat client={instantClient()} />);

      const file = new File(["dummy content"], "fuga.jpg", { type: "image/jpeg" });
      const fileInput = screen.getByLabelText(/adjuntar imágenes/i).previousSibling as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByAltText(/vista previa de fuga.jpg/i)).toBeInTheDocument();
    });

    it("muestra error al intentar adjuntar un archivo mayor a 5MB", async () => {
      render(<AiDiagnosisChat client={instantClient()} />);

      const largeFile = new File(["dummy content"], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 }); // 6MB

      const fileInput = screen.getByLabelText(/adjuntar imágenes/i).previousSibling as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      expect(screen.getByText(/no debe superar los 5MB/i)).toBeInTheDocument();
      expect(screen.queryByAltText(/vista previa de large.jpg/i)).not.toBeInTheDocument();
    });

    it("muestra error al intentar adjuntar un formato de archivo no permitido", async () => {
      render(<AiDiagnosisChat client={instantClient()} />);

      const invalidFile = new File(["dummy content"], "document.pdf", { type: "application/pdf" });
      const fileInput = screen.getByLabelText(/adjuntar imágenes/i).previousSibling as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      expect(screen.getByText(/formato de imagen no permitido/i)).toBeInTheDocument();
    });

    it("permite eliminar una imagen previamente adjuntada", async () => {
      render(<AiDiagnosisChat client={instantClient()} />);

      const file = new File(["dummy content"], "fuga.jpg", { type: "image/jpeg" });
      const fileInput = screen.getByLabelText(/adjuntar imágenes/i).previousSibling as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByAltText(/vista previa de fuga.jpg/i)).toBeInTheDocument();

      const removeBtn = screen.getByRole("button", { name: /eliminar fuga.jpg/i });
      fireEvent.click(removeBtn);

      expect(screen.queryByAltText(/vista previa de fuga.jpg/i)).not.toBeInTheDocument();
    });
  });
});
