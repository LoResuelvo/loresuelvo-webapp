import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

  it("navega a la pantalla de chat al presionar Diagnosticar guardando en localStorage", () => {
    render(<DiagnosisHero />);

    fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
      target: { value: "Se está filtrando agua debajo de la bacha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/consumidor/mensajes-ia");
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
    const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
    expect(storedData.length).toBe(1);
    expect(storedData[0].content).toBe("Se está filtrando agua debajo de la bacha");
  });

  it("no navega si el mensaje está vacío", () => {
    render(<DiagnosisHero />);

    fireEvent.click(screen.getByRole("button", { name: /diagnosticar/i }));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
