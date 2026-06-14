import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiDiagnosisChat from "@/components/consumidor/diagnosis/AiDiagnosisChat";

const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

describe("AiDiagnosisChat", () => {
  it("muestra el mensaje inicial del usuario recibido por query param", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: "Se está filtrando agua debajo de la bacha" }),
    );

    render(<AiDiagnosisChat />);

    await waitFor(() => {
      expect(
        screen.getByText("Se está filtrando agua debajo de la bacha"),
      ).toBeInTheDocument();
    });
  });

  it("muestra la respuesta simulada del asistente junto al primer mensaje", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: "Se está filtrando agua debajo de la bacha" }),
    );

    render(<AiDiagnosisChat />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?",
        ),
      ).toBeInTheDocument();
    });
  });

  it("alinea el mensaje del usuario a la derecha y el del asistente a la izquierda", async () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams({ mensaje: "Se está filtrando agua debajo de la bacha" }),
    );

    const { container } = render(<AiDiagnosisChat />);

    await waitFor(() => {
      const ownRow = container.querySelector('[data-testid="message-bubble-msg-user-1"]')?.parentElement;
      const assistantRow = container.querySelector('[data-testid="message-bubble-msg-assistant-1"]')?.parentElement;
      expect(ownRow).toHaveClass("justify-end");
      expect(assistantRow).toHaveClass("justify-start");
    });
  });

  it("no muestra conversación cuando no hay mensaje en la URL", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    render(<AiDiagnosisChat />);

    expect(
      screen.queryByText("Se está filtrando agua debajo de la bacha"),
    ).not.toBeInTheDocument();
  });
});
