import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import WorkRequestModal from "@/components/consumer/search/WorkRequestModal";
import * as actions from "@/app/consumidor/buscar/actions";
import { Provider } from "@/domain/provider/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/app/consumidor/buscar/actions", () => ({
  createJobRequest: vi.fn(),
}));

const mockGetPresignedUrl = vi.fn();
const mockUploadFile = vi.fn();
const mockConfirmUpload = vi.fn();

vi.mock("@/infrastructure/repositories/client-repositories", () => {
  class MockClientFileRepository {
    getPresignedUrl = mockGetPresignedUrl;
    uploadFile = mockUploadFile;
    confirmUpload = mockConfirmUpload;
  }
  return {
    ClientFileRepository: MockClientFileRepository,
  };
});

// Mock URL.createObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}

const mockProvider: Provider = {
  id: 1,
  name: "Juan",
  surname: "Pérez",
  categoryName: "Plomería",
  description: "Plomero matriculado.",
};

describe("WorkRequestModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with provider information and form fields", () => {
    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);

    expect(screen.getByRole("heading", { name: "Crear Solicitud de Trabajo" })).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Categoría: Plomería")).toBeInTheDocument();
    expect(screen.getByLabelText(/título del problema/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción del problema/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar solicitud" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("shows validation error if submitted empty", async () => {
    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);

    const submitButton = screen.getByRole("button", { name: "Enviar solicitud" });
    fireEvent.click(submitButton);

    expect(actions.createJobRequest).not.toHaveBeenCalled();
  });

  it("submits the form successfully and redirects", async () => {
    (actions.createJobRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: 123,
        conversationId: 456,
        title: "Gotera en cocina",
        description: "Tengo una filtración debajo de la bacha.",
        images: [],
      }
    });

    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);

    const titleInput = screen.getByLabelText(/título del problema/i);
    const descInput = screen.getByLabelText(/descripción del problema/i);
    const submitButton = screen.getByRole("button", { name: "Enviar solicitud" });

    fireEvent.change(titleInput, { target: { value: "Gotera en cocina" } });
    fireEvent.change(descInput, { target: { value: "Tengo una filtración debajo de la bacha." } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(actions.createJobRequest).toHaveBeenCalledWith(
        mockProvider.id,
        "Gotera en cocina",
        "Tengo una filtración debajo de la bacha.",
        undefined
      );
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining(`/consumidor/mensajes?provider_id=1&name=Juan&surname=P%C3%A9rez`)
      );
    });
  });

  it("displays specific backend error when job request already exists", async () => {
    (actions.createJobRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Job request already exists",
    });

    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);

    const titleInput = screen.getByLabelText(/título del problema/i);
    const descInput = screen.getByLabelText(/descripción del problema/i);
    const submitButton = screen.getByRole("button", { name: "Enviar solicitud" });

    fireEvent.change(titleInput, { target: { value: "Gotera en cocina" } });
    fireEvent.change(descInput, { target: { value: "Tengo una filtración debajo de la bacha." } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Ya tienes una solicitud de trabajo o conversación pendiente con este profesional.")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("renders attach images button", () => {
    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);
    expect(screen.getByRole("button", { name: /Adjuntar imágenes/ })).toBeInTheDocument();
  });

  it("shows image preview after attaching a file and can remove it", async () => {
    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);
    
    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByAltText(/test.png/i)).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: /Eliminar test.png/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByAltText(/test.png/i)).not.toBeInTheDocument();
  });

  it("prevents attaching more than 3 images", async () => {
    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);
    
    const file1 = new File(["1"], "test1.png", { type: "image/png" });
    const file2 = new File(["2"], "test2.png", { type: "image/png" });
    const file3 = new File(["3"], "test3.png", { type: "image/png" });
    const file4 = new File(["4"], "test4.png", { type: "image/png" });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    // Attach 3 files first (valid)
    fireEvent.change(input, { target: { files: [file1, file2, file3] } });
    expect(screen.getByAltText(/test1.png/i)).toBeInTheDocument();
    expect(screen.getByAltText(/test2.png/i)).toBeInTheDocument();
    expect(screen.getByAltText(/test3.png/i)).toBeInTheDocument();

    // Try to attach a 4th file
    fireEvent.change(input, { target: { files: [file4] } });
    expect(screen.getByText("Ya alcanzaste el límite de 3 imágenes")).toBeInTheDocument();
    expect(screen.queryByAltText(/test4.png/i)).not.toBeInTheDocument();
  });

  it("submits form with image file ids", async () => {
    mockGetPresignedUrl.mockResolvedValue({
      file_id: "fid-1",
      key: "k-1",
      upload_url: "http://upload.com/1",
      headers: {}
    });
    mockUploadFile.mockResolvedValue(undefined);
    mockConfirmUpload.mockResolvedValue({ id: "uploaded-id-1", url: "http://r2.com/1", original_name: "test.png" });

    (actions.createJobRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        id: 123,
        conversationId: 456,
        title: "Gotera en cocina",
        description: "Tengo una filtración debajo de la bacha.",
        images: [{ id: "uploaded-id-1", url: "http://r2.com/1", originalName: "test.png" }]
      }
    });

    render(<WorkRequestModal provider={mockProvider} onClose={mockOnClose} />);

    const titleInput = screen.getByLabelText(/título del problema/i);
    const descInput = screen.getByLabelText(/descripción del problema/i);
    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const submitButton = screen.getByRole("button", { name: "Enviar solicitud" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(titleInput, { target: { value: "Gotera en cocina" } });
    fireEvent.change(descInput, { target: { value: "Tengo una filtración debajo de la bacha." } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockGetPresignedUrl).toHaveBeenCalledWith("test.png", "image/png", file.size, "job_request_image");
      expect(mockUploadFile).toHaveBeenCalled();
      expect(mockConfirmUpload).toHaveBeenCalledWith("fid-1", "k-1", "image/png", file.size);
      expect(actions.createJobRequest).toHaveBeenCalledWith(
        mockProvider.id,
        "Gotera en cocina",
        "Tengo una filtración debajo de la bacha.",
        ["uploaded-id-1"]
      );
    });
  });
});
