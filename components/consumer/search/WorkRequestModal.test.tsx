import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkRequestModal from "@/components/consumer/search/WorkRequestModal";
import { Provider } from "@/lib/api/types";

const mockProvider: Provider = {
  id: 1,
  name: "Juan",
  surname: "Pérez",
  category_name: "Plomería",
  description: "Plomero matriculado.",
};

describe("WorkRequestModal", () => {
  const mockOnClose = vi.fn();

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
});
