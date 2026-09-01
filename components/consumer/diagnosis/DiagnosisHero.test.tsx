import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DiagnosisHero from "@/components/consumer/diagnosis/DiagnosisHero";
import { createAiConversationAction } from "@/app/consumidor/mensajes-ia/actions";

const mockAssign = vi.fn();

const mockSessionStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(global, "sessionStorage", {
  value: mockSessionStorage,
});

Object.defineProperty(window, "location", {
  value: {
    _href: "",
    get href() { return this._href; },
    set href(url: string) { this._href = url; mockAssign(url); },
  },
  writable: true,
});

global.URL.createObjectURL = vi.fn(() => "blob:https://loresuelvo.com/mock-blob");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/consumidor/mensajes-ia/actions", () => ({
  createAiConversationAction: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
}));

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn().mockResolvedValue({
    fileId: "confirmed-file-id-123",
    url: "https://storage.test/file.png",
    originalName: "file.png",
  }),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
});

afterEach(() => {
  cleanup();
  mockAssign.mockReset();
  mockSessionStorage.getItem.mockReturnValue(null);
  mockSessionStorage.setItem.mockClear();
});

describe("DiagnosisHero", () => {
  beforeEach(() => {
    mockAssign.mockReset();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it("muestra el título y el input para describir el problema", () => {
    render(<DiagnosisHero />);
    expect(screen.getByText(/¿qué está pasando en tu hogar\?/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe el problema/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /diagnosticar/i })).toBeInTheDocument();
  });

  it("navega a la pantalla de chat al presionar Diagnosticar", async () => {
    render(<DiagnosisHero />);

    fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
      target: { value: "Se está filtrando agua debajo de la bacha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledTimes(1);
    });
  });

  it("redirige con el id de la conversación creada después de esperar la respuesta del AI", async () => {
    render(<DiagnosisHero />);

    fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
      target: { value: "Se está filtrando agua debajo de la bacha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledTimes(1);
    });

    const assignedUrl = mockAssign.mock.calls[0][0] as string;
    expect(assignedUrl).toContain("id=1");
    expect(assignedUrl).toContain("/consumidor/mensajes-ia");
  });

  it("muestra spinner en el botón mientras espera la respuesta del AI", async () => {
    let resolveCreate: (value: { success: boolean; data: { id: number } }) => void = () => undefined;
    (createAiConversationAction as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise<{ success: boolean; data: { id: number } }>((resolve) => { resolveCreate = resolve; })
    );

    render(<DiagnosisHero />);

    fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
      target: { value: "Se está filtrando agua debajo de la bacha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /diagnosticando/i })).toBeInTheDocument();
    });

    resolveCreate({ success: true, data: { id: 1 } });
  });

  it("no navega si el mensaje está vacío", () => {
    render(<DiagnosisHero />);

    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    expect(mockAssign).not.toHaveBeenCalled();
  });

  describe("Funcionalidad de adjuntos de imagen en Hero", () => {
    it("muestra el botón para adjuntar imágenes", () => {
      render(<DiagnosisHero />);
      expect(screen.getByRole("button", { name: /adjuntar imágenes/i })).toBeInTheDocument();
    });

    it("permite agregar una imagen válida y mostrar su miniatura", async () => {
      const { container } = render(<DiagnosisHero />);

      const file = new File(["dummy content"], "fuga.jpg", { type: "image/jpeg" });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByAltText(/vista previa de fuga.jpg/i)).toBeInTheDocument();
    });

    it("muestra error al intentar adjuntar un archivo mayor a 5MB", async () => {
      const { container } = render(<DiagnosisHero />);

      const largeFile = new File(["dummy content"], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 }); // 6MB

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
      });

      expect(screen.getByText(/no debe superar los 5MB/i)).toBeInTheDocument();
      expect(screen.queryByAltText(/vista previa de large.jpg/i)).not.toBeInTheDocument();
    });

    it("muestra error al intentar adjuntar un formato de archivo no permitido", async () => {
      const { container } = render(<DiagnosisHero />);

      const invalidFile = new File(["dummy content"], "document.pdf", { type: "application/pdf" });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      expect(screen.getByText(/formato de imagen no permitido/i)).toBeInTheDocument();
    });

    it("permite eliminar una imagen previamente adjuntada", async () => {
      const { container } = render(<DiagnosisHero />);

      const file = new File(["dummy content"], "fuga.jpg", { type: "image/jpeg" });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByAltText(/vista previa de fuga.jpg/i)).toBeInTheDocument();

      const removeBtn = screen.getByRole("button", { name: /eliminar fuga.jpg/i });
      fireEvent.click(removeBtn);

      expect(screen.queryByAltText(/vista previa de fuga.jpg/i)).not.toBeInTheDocument();
    });

    it("permite adjuntar dos archivos con el mismo nombre y muestra ambos", async () => {
      const { container } = render(<DiagnosisHero />);

      const file1 = new File(["content 1"], "fuga.jpg", { type: "image/jpeg" });
      const file2 = new File(["content 2"], "fuga.jpg", { type: "image/jpeg" });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file1, file2] } });
      });

      const previews = screen.getAllByAltText(/vista previa de fuga.jpg/i);
      expect(previews).toHaveLength(2);
    });

    it("cierra el modal de vista previa cuando se elimina el adjunto mostrado", async () => {
      const { container } = render(<DiagnosisHero />);

      const file = new File(["dummy content"], "fuga.jpg", { type: "image/jpeg" });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      const thumbnail = screen.getByAltText(/vista previa de fuga.jpg/i);
      fireEvent.click(thumbnail);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const removeBtn = screen.getByRole("button", { name: /eliminar fuga.jpg/i, hidden: true });
      fireEvent.click(removeBtn);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
