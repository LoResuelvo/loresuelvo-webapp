import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MercadoPagoCallbackPage from "./page";
import { ROUTES } from "@/lib/routes";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockGetParam = vi.fn();
const mockConsumeProfileOrigin = vi.fn(() => false);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGetParam,
  }),
}));

vi.mock("@/lib/mercado-pago-profile-origin", () => ({
  consumeMercadoPagoConnectionOrigin: () => mockConsumeProfileOrigin(),
}));

describe("MercadoPagoCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsumeProfileOrigin.mockReturnValue(false);
  });

  it("renders success state and redirects when continue is clicked", async () => {
    mockGetParam.mockReturnValue("success");

    render(<MercadoPagoCallbackPage />);

    expect(await screen.findByText("¡Cuenta conectada exitosamente!")).toBeInTheDocument();
    expect(screen.getByText("Tu cuenta de Mercado Pago fue vinculada correctamente. Ya podés enviar propuestas de servicio.")).toBeInTheDocument();
    
    const continueBtn = screen.getByRole("button", { name: "Continuar" });
    fireEvent.click(continueBtn);

    expect(mockPush).toHaveBeenCalledWith(ROUTES.provider.home);
  });

  it("renders cancelled state, and handles retry and skip actions", async () => {
    mockGetParam.mockReturnValue("cancelled");

    render(<MercadoPagoCallbackPage />);

    expect(await screen.findByText("La conexión fue cancelada")).toBeInTheDocument();
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

  it("redirects to provider home if query parameter is missing or invalid", async () => {
    mockGetParam.mockReturnValue(null);

    render(<MercadoPagoCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(ROUTES.provider.home));
  });

  it("returns to the profile only when the tab has a pending profile origin", async () => {
    mockGetParam.mockReturnValue("cancelled");
    mockConsumeProfileOrigin.mockReturnValue(true);

    render(<MercadoPagoCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        `${ROUTES.provider.profile}?mercado_pago_result=cancelled`,
      );
    });
    expect(screen.queryByText("La conexión fue cancelada")).not.toBeInTheDocument();
  });

  it("does not replay the origin decision under StrictMode", async () => {
    mockGetParam.mockReturnValue("success");
    mockConsumeProfileOrigin.mockReturnValueOnce(true).mockReturnValue(false);

    render(
      <StrictMode>
        <MercadoPagoCallbackPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        `${ROUTES.provider.profile}?mercado_pago_result=success`,
      );
    });
    expect(mockConsumeProfileOrigin).toHaveBeenCalledOnce();
    expect(screen.queryByText("¡Cuenta conectada exitosamente!")).not.toBeInTheDocument();
  });
});
