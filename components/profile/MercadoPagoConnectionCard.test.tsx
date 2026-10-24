import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useMercadoPagoAuthorization } from "./useMercadoPagoAuthorization";
import MercadoPagoConnectionCard from "./MercadoPagoConnectionCard";

vi.mock("./useMercadoPagoAuthorization", () => ({
  useMercadoPagoAuthorization: vi.fn(),
}));

const mockUseMercadoPagoAuthorization = vi.mocked(useMercadoPagoAuthorization);

function idleAuthorizationState() {
  return {
    isAuthorizing: false,
    error: null,
    startAuthorization: vi.fn().mockResolvedValue(true),
  };
}

describe("MercadoPagoConnectionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMercadoPagoAuthorization.mockReturnValue(idleAuthorizationState());
  });

  it("renders the pending state and its connection action", () => {
    render(
      <MercadoPagoConnectionCard
        connection={{
          status: "pending",
          canReceivePayments: false,
          canSendServiceProposals: false,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument();
    expect(screen.getByText("Sin vincular", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vincular Mercado Pago" })).toBeInTheDocument();
  });

  it("renders the connected state without a reconnection action", () => {
    render(
      <MercadoPagoConnectionCard
        connection={{
          status: "connected",
          accountId: "mp-account-1",
          canReceivePayments: true,
          canSendServiceProposals: true,
        }}
      />,
    );

    expect(screen.getByText("Vinculada", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a safe error when the connection status could not be loaded", () => {
    render(<MercadoPagoConnectionCard connection={null} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos consultar el estado de tu cuenta de Mercado Pago",
    );
  });

  it("shows the authorization action as busy and disabled", () => {
    mockUseMercadoPagoAuthorization.mockReturnValue({
      isAuthorizing: true,
      error: null,
      startAuthorization: vi.fn().mockResolvedValue(false),
    });

    render(
      <MercadoPagoConnectionCard
        connection={{
          status: "pending",
          canReceivePayments: false,
          canSendServiceProposals: false,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Conectando con Mercado Pago…" })).toBeDisabled();
  });

  it("shows a safe authorization error", () => {
    mockUseMercadoPagoAuthorization.mockReturnValue({
      isAuthorizing: false,
      error: "No pudimos iniciar la vinculación con Mercado Pago. Intentá nuevamente.",
      startAuthorization: vi.fn().mockResolvedValue(false),
    });

    render(
      <MercadoPagoConnectionCard
        connection={{
          status: "pending",
          canReceivePayments: false,
          canSendServiceProposals: false,
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos iniciar la vinculación con Mercado Pago",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Internal Server Error");
  });
});
