import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MercadoPagoCallbackPage from "./page";
import { startMercadoPagoConnectionAction } from "@/app/onboarding/mercado-pago-actions";
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

vi.mock("@/app/onboarding/mercado-pago-actions", () => ({
  startMercadoPagoConnectionAction: vi.fn(),
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

  it("renders cancelled state, and handles retry and skip actions", async () => {
    mockGetParam.mockReturnValue("cancelled");
    vi.mocked(startMercadoPagoConnectionAction).mockResolvedValue({
      authorizationUrl: "https://auth.mercadopago.com/retry-url",
    });

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
    expect(retryBtn).toBeDisabled();

    await waitFor(() => {
      expect(startMercadoPagoConnectionAction).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("https://auth.mercadopago.com/retry-url");
    });
  });

  it("displays error message if retry fails", async () => {
    mockGetParam.mockReturnValue("cancelled");
    vi.mocked(startMercadoPagoConnectionAction).mockRejectedValue(new Error("Connection error"));

    render(<MercadoPagoCallbackPage />);

    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    fireEvent.click(retryBtn);

    const errorMessage = await screen.findByText("Hubo un problema al iniciar la conexión. Inténtalo nuevamente.");
    expect(errorMessage).toBeInTheDocument();
    expect(retryBtn).not.toBeDisabled();
  });

  it("redirects to provider home if query parameter is missing or invalid", () => {
    mockGetParam.mockReturnValue(null);

    render(<MercadoPagoCallbackPage />);

    expect(mockReplace).toHaveBeenCalledWith(ROUTES.provider.home);
  });
});
