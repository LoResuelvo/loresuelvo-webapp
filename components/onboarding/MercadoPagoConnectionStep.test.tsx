import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MercadoPagoConnectionStep } from "./MercadoPagoConnectionStep";
import { startMercadoPagoConnectionAction } from "@/app/onboarding/mercado-pago-actions";
import { ROUTES } from "@/lib/routes";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/app/onboarding/mercado-pago-actions", () => ({
  startMercadoPagoConnectionAction: vi.fn(),
}));

describe("MercadoPagoConnectionStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders titles, connection button, and skip button", () => {
    render(<MercadoPagoConnectionStep />);

    expect(screen.getByText("Conectá tu cuenta de Mercado Pago")).toBeInTheDocument();
    expect(screen.getByText("Para poder enviar propuestas y recibir pagos, necesitás vincular tu cuenta de Mercado Pago.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar con Mercado Pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hacerlo más tarde" })).toBeInTheDocument();
  });

  it("calls startMercadoPagoConnectionAction and redirects to authorization URL when connect button is clicked", async () => {
    vi.mocked(startMercadoPagoConnectionAction).mockResolvedValue({
      authorizationUrl: "https://auth.mercadopago.com/redirect-url",
    });

    render(<MercadoPagoConnectionStep />);

    const connectButton = screen.getByRole("button", { name: "Conectar con Mercado Pago" });
    fireEvent.click(connectButton);

    expect(connectButton).toHaveTextContent("Conectando...");
    expect(connectButton).toBeDisabled();

    await waitFor(() => {
      expect(startMercadoPagoConnectionAction).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("https://auth.mercadopago.com/redirect-url");
    });
  });

  it("displays error message if the action fails", async () => {
    vi.mocked(startMercadoPagoConnectionAction).mockRejectedValue(new Error("Connection error"));

    render(<MercadoPagoConnectionStep />);

    const connectButton = screen.getByRole("button", { name: "Conectar con Mercado Pago" });
    fireEvent.click(connectButton);

    const errorMessage = await screen.findByText("Hubo un problema al iniciar la conexión. Inténtalo nuevamente.");
    expect(errorMessage).toBeInTheDocument();
    expect(connectButton).not.toBeDisabled();
    expect(connectButton).toHaveTextContent("Conectar con Mercado Pago");
  });

  it("redirects to provider home when skip button is clicked", () => {
    render(<MercadoPagoConnectionStep />);

    const skipButton = screen.getByRole("button", { name: "Hacerlo más tarde" });
    fireEvent.click(skipButton);

    expect(mockPush).toHaveBeenCalledWith(ROUTES.provider.home);
  });
});
