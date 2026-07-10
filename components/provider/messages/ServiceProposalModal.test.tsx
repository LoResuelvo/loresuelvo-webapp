import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServiceProposalModal } from "./ServiceProposalModal";

describe("ServiceProposalModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with fields and labels", () => {
    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole("heading", { name: "Propuesta de Servicio" })).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha y hora")).toBeInTheDocument();
    expect(screen.getByLabelText("Motivo de la visita")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar propuesta" })).toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("keeps send button disabled when fields are empty", () => {
    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    const sendBtn = screen.getByRole("button", { name: "Enviar propuesta" });
    expect(sendBtn).toBeDisabled();
  });

  it("shows validation error and disables submit when amount is <= 0", async () => {
    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByLabelText("Monto");
    fireEvent.change(amountInput, { target: { value: "0" } });

    expect(await screen.findByText("El monto debe ser mayor a cero.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar propuesta" })).toBeDisabled();
  });

  it("shows validation error and disables submit when date is in the past", async () => {
    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    const dateInput = screen.getByLabelText("Fecha y hora");
    fireEvent.change(dateInput, { target: { value: "2020-01-01T12:00" } });

    expect(await screen.findByText("La fecha y hora deben ser futuras.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar propuesta" })).toBeDisabled();
  });

  it("submits the form successfully and triggers success UI", async () => {
    vi.useFakeTimers();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByLabelText("Monto");
    const dateInput = screen.getByLabelText("Fecha y hora");
    const descInput = screen.getByLabelText("Motivo de la visita");
    const sendBtn = screen.getByRole("button", { name: "Enviar propuesta" });

    // Set future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().slice(0, 16);

    fireEvent.change(amountInput, { target: { value: "15000.50" } });
    fireEvent.change(dateInput, { target: { value: dateString } });
    fireEvent.change(descInput, { target: { value: "Reparación de pérdida" } });

    expect(sendBtn).not.toBeDisabled();

    fireEvent.click(sendBtn);

    await vi.runOnlyPendingTimersAsync();

    expect(mockOnSubmit).toHaveBeenCalledWith({
      consumerId: 10,
      amount: "15000.50",
      scheduledOn: new Date(dateString).toISOString(),
      description: "Reparación de pérdida",
    });

    expect(screen.getByText("Propuesta enviada exitosamente. El consumidor fue notificado.")).toBeInTheDocument();

    // Advance timers to trigger automatic modal close
    vi.advanceTimersByTime(2000);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("displays API error message when submit fails", async () => {
    vi.useFakeTimers();
    mockOnSubmit.mockRejectedValue(new Error("API Error"));

    render(
      <ServiceProposalModal
        open={true}
        onClose={mockOnClose}
        consumerId={10}
        onSubmit={mockOnSubmit}
      />
    );

    const amountInput = screen.getByLabelText("Monto");
    const dateInput = screen.getByLabelText("Fecha y hora");
    const descInput = screen.getByLabelText("Motivo de la visita");
    const sendBtn = screen.getByRole("button", { name: "Enviar propuesta" });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().slice(0, 16);

    fireEvent.change(amountInput, { target: { value: "15000.50" } });
    fireEvent.change(dateInput, { target: { value: dateString } });
    fireEvent.change(descInput, { target: { value: "Reparación" } });

    fireEvent.click(sendBtn);

    await vi.runOnlyPendingTimersAsync();

    expect(screen.getByText("Hubo un problema al enviar la propuesta. Por favor intenta de nuevo.")).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
