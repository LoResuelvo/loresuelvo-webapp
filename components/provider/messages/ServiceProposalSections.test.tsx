import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ProposalPricingSection } from "./ProposalPricingSection";
import { ProposalDescriptionSection } from "./ProposalDescriptionSection";
import { ProposalScheduleSection } from "./ProposalScheduleSection";
import { ProposalConfirmDialog } from "./ProposalConfirmDialog";

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="alert-dialog-mock">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe("ServiceProposal Sections", () => {
  describe("ProposalPricingSection", () => {
    it("renders amount input and triggers onChange", () => {
      const onChange = vi.fn();
      render(
        <ProposalPricingSection
          amount="1200"
          onChangeAmount={onChange}
          error="Monto inválido"
        />
      );

      const input = screen.getByLabelText("Monto");
      expect(input).toHaveValue(1200);
      expect(screen.getByText("Monto inválido")).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "1500" } });
      expect(onChange).toHaveBeenCalledWith("1500");
    });
  });

  describe("ProposalScheduleSection", () => {
    it("renders scheduled date, time and duration with error messages", () => {
      const onChangeDate = vi.fn();
      const onChangeTime = vi.fn();
      const onChangeDurationPreset = vi.fn();
      const onChangeCustomDuration = vi.fn();

      render(
        <ProposalScheduleSection
          schedule={{
            scheduledDate: "2026-09-01",
            scheduledTime: "14:00",
            selectedDurationPreset: "custom",
            estimatedDurationMinutes: "45",
          }}
          onChange={{
            onChangeDate,
            onChangeTime,
            onChangeDurationPreset,
            onChangeCustomDuration,
          }}
          errors={{
            dateError: "Fecha inválida",
            durationError: "Duración inválida",
          }}
        />
      );

      expect(screen.getByText("01/09/2026")).toBeInTheDocument();
      expect(screen.getByText("Fecha inválida")).toBeInTheDocument();
      expect(screen.getByText("Duración inválida")).toBeInTheDocument();

      const customInput = screen.getByPlaceholderText("En minutos (ej: 90)");
      expect(customInput).toHaveValue(45);
      fireEvent.change(customInput, { target: { value: "60" } });
      expect(onChangeCustomDuration).toHaveBeenCalledWith("60");
    });
  });

  describe("ProposalDescriptionSection", () => {
    it("renders textarea and triggers onChange", () => {
      const onChange = vi.fn();
      render(
        <ProposalDescriptionSection
          description="Arreglo de canilla"
          onChangeDescription={onChange}
        />
      );

      const textarea = screen.getByLabelText("Motivo de la visita");
      expect(textarea).toHaveValue("Arreglo de canilla");

      fireEvent.change(textarea, { target: { value: "Nueva descripción" } });
      expect(onChange).toHaveBeenCalledWith("Nueva descripción");
    });
  });

  describe("ProposalConfirmDialog", () => {
    it("renders confirmation dialog and triggers onConfirm", () => {
      const onConfirm = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ProposalConfirmDialog
          open={true}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Confirmar propuesta")).toBeInTheDocument();
      expect(screen.getByText("¿Estás seguro de enviar esta propuesta de servicio?")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Sí, enviar propuesta" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
