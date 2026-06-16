import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import WorkRequestModal from "@/components/consumer/search/WorkRequestModal";
import * as actions from "@/app/consumidor/buscar/actions";
import { Provider } from "@/infrastructure/api/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/app/consumidor/buscar/actions", () => ({
  createJobRequest: vi.fn(),
}));

const mockProvider: Provider = {
  id: 1,
  name: "Juan",
  surname: "Pérez",
  category_name: "Plomería",
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
        conversation_id: 456,
        title: "Gotera en cocina",
        description: "Tengo una filtración debajo de la bacha.",
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
        "Tengo una filtración debajo de la bacha."
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
});
