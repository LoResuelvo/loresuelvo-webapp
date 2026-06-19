import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
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

vi.mock("@/infrastructure/repositories/api-assistant-client", () => ({
  createApiAssistantClient: () => ({
    requestReply: vi.fn().mockResolvedValue("Revisá el sifón."),
  }),
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
});
