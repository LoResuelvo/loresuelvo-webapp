import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MercadoPagoCallbackPage from "./page";
import { ROUTES } from "@/lib/routes";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockGetParam = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGetParam,
  }),
}));

describe("MercadoPagoCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders success state and redirects when continue is clicked", () => {
    mockGetParam.mockReturnValue("success");

    render(<MercadoPagoCallbackPage />);

    expect(screen.getByText("¡Cuenta conectada exitosamente!")).toBeInTheDocument();
    expect(screen.getByText("Tu cuenta de Mercado Pago fue vinculada correctamente. Ya podés enviar propuestas de servicio.")).toBeInTheDocument();
    
    const continueBtn = screen.getByRole("button", { name: "Continuar" });
    fireEvent.click(continueBtn);

    expect(mockPush).toHaveBeenCalledWith(ROUTES.provider.home);
  });

  it("renders cancelled state, and handles retry and skip actions", () => {
    mockGetParam.mockReturnValue("cancelled");

    render(<MercadoPagoCallbackPage />);

    expect(screen.getByText("La conexión fue cancelada")).toBeInTheDocument();
    expect(screen.getByText("No se vinculó ninguna cuenta. Podés intentar nuevamente cuando quieras.")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    const skipBtn = screen.getByRole("button", { name: "Continuar" });

    // Test Skip
    fireEvent.click(skipBtn);
    expect(mockPush).toHaveBeenCalledWith(ROUTES.provider.home);

    // Test Retry
    fireEvent.click(retryBtn);
    expect(mockPush).toHaveBeenCalledWith(ROUTES.onboarding);
  });

  it("redirects to provider home if query parameter is missing or invalid", () => {
    mockGetParam.mockReturnValue(null);

    render(<MercadoPagoCallbackPage />);

    expect(mockReplace).toHaveBeenCalledWith(ROUTES.provider.home);
  });
});
