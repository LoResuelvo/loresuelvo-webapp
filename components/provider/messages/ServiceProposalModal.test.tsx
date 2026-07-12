import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { ServiceProposalModal } from "./ServiceProposalModal";

vi.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: { onValueChange: (value: string) => void, children: React.ReactNode }) => (
    <div data-testid="select-mock">
      <input data-testid="time-input" onChange={(e) => onValueChange(e.target.value)} />
      {children}
    </div>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-mock">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  PopoverContent: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div data-testid="alert-dialog-mock">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <input 
      data-testid="calendar-input" 
      onChange={(e) => onSelect(new Date(e.target.value + "T00:00:00"))} 
    />
  )
}));

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
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Hora")).toBeInTheDocument();
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

    const dateInput = screen.getByTestId("calendar-input");
    fireEvent.change(dateInput, { target: { value: "2020-01-01" } });

    const timeInput = screen.getByTestId("time-input");
    fireEvent.change(timeInput, { target: { value: "12:00" } });

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
    const descInput = screen.getByLabelText("Motivo de la visita");
    const sendBtn = screen.getByRole("button", { name: "Enviar propuesta" });

    fireEvent.change(amountInput, { target: { value: "15000.50" } });
    fireEvent.change(descInput, { target: { value: "Reparación de pérdida" } });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().slice(0, 16);

    const dateInput = screen.getByTestId("calendar-input");
    fireEvent.change(dateInput, { target: { value: dateString.split("T")[0] } });

    const timeInput = screen.getByTestId("time-input");
    fireEvent.change(timeInput, { target: { value: "12:00" } });

    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);

    const confirmBtn = screen.getByRole("button", { name: "Sí, enviar propuesta" });
    fireEvent.click(confirmBtn);

    await vi.runOnlyPendingTimersAsync();

    expect(mockOnSubmit).toHaveBeenCalledWith({
      consumerId: 10,
      amount: "15000.50",
      scheduledOn: new Date(dateString.split("T")[0] + "T12:00:00").toISOString(),
      description: "Reparación de pérdida",
    });
    expect(screen.getByText("Propuesta enviada exitosamente. El consumidor fue notificado.")).toBeInTheDocument();

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
    const descInput = screen.getByLabelText("Motivo de la visita");
    const sendBtn = screen.getByRole("button", { name: "Enviar propuesta" });

    fireEvent.change(amountInput, { target: { value: "15000.50" } });
    fireEvent.change(descInput, { target: { value: "Reparación" } });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateString = futureDate.toISOString().slice(0, 16);

    const dateInput = screen.getByTestId("calendar-input");
    fireEvent.change(dateInput, { target: { value: dateString.split("T")[0] } });

    const timeInput = screen.getByTestId("time-input");
    fireEvent.change(timeInput, { target: { value: "12:00" } });

    fireEvent.click(sendBtn);

    const confirmBtn = screen.getByRole("button", { name: "Sí, enviar propuesta" });
    fireEvent.click(confirmBtn);

    await vi.runOnlyPendingTimersAsync();

    expect(screen.getByText("Hubo un problema al enviar la propuesta. Por favor intenta de nuevo.")).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
