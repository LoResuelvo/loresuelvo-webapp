import { describe, expect, it, vi } from "vitest";
import { startMercadoPagoConnection } from "./start-mercado-pago-connection";
import { PaymentAccountRepository } from "@/ports/payment-account-repository";

describe("startMercadoPagoConnection", () => {
  const mockPaymentAccountRepository = {
    getConnection: vi.fn(),
    startAuthorization: vi.fn(),
  } as unknown as PaymentAccountRepository;

  it("calls startAuthorization on repository and returns authorizationUrl", async () => {
    vi.mocked(mockPaymentAccountRepository.startAuthorization).mockResolvedValue({
      authorizationUrl: "https://auth.mercadopago.com/authorization?state=test",
      state: "test",
    });

    const result = await startMercadoPagoConnection(mockPaymentAccountRepository);

    expect(mockPaymentAccountRepository.startAuthorization).toHaveBeenCalled();
    expect(result).toEqual({
      authorizationUrl: "https://auth.mercadopago.com/authorization?state=test",
    });
  });

  it("propagates repository errors", async () => {
    vi.mocked(mockPaymentAccountRepository.startAuthorization).mockRejectedValue(new Error("API Error"));

    await expect(startMercadoPagoConnection(mockPaymentAccountRepository)).rejects.toThrow("API Error");
  });
});
