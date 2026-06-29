import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DiagnosisHero from "@/components/consumer/diagnosis/DiagnosisHero";

const mockPush = vi.fn();

const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
});

global.URL.createObjectURL = vi.fn(() => "blob:https://loresuelvo.com/mock-blob");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/consumidor/mensajes-ia/actions", () => ({
  createAiConversationAction: vi.fn().mockResolvedValue({ id: 1 }),
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

afterEach(() => {
  cleanup();
  mockPush.mockReset();
  mockLocalStorage.getItem.mockReturnValue(null);
  mockLocalStorage.setItem.mockClear();
});

describe("DiagnosisHero", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLocalStorage.getItem.mockReturnValue(null);
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
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  it("no navega si el mensaje está vacío", () => {
    render(<DiagnosisHero />);

    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    expect(mockPush).not.toHaveBeenCalled();
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
  });
});
