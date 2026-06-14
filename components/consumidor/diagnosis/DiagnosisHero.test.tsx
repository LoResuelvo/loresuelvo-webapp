import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DiagnosisHero from "@/components/consumidor/diagnosis/DiagnosisHero";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

afterEach(() => {
  cleanup();
  mockPush.mockReset();
});

describe("DiagnosisHero", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("muestra el título y el input para describir el problema", () => {
    render(<DiagnosisHero />);
    expect(screen.getByText(/¿qué está pasando en tu hogar\?/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe el problema/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /diagnosticar/i })).toBeInTheDocument();
  });

  it("navega a la pantalla de chat con el mensaje al presionar Diagnosticar", () => {
    render(<DiagnosisHero />);

    fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
      target: { value: "Se está filtrando agua debajo de la bacha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      "/consumidor/diagnostico?mensaje=Se+est%C3%A1+filtrando+agua+debajo+de+la+bacha",
    );
  });

  it("no navega si el mensaje está vacío", () => {
    render(<DiagnosisHero />);

    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
