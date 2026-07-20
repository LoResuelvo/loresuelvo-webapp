import { describe, expect, it, vi } from "vitest";
import { getPaymentAccountConnection } from "./get-payment-account-connection";
import { PaymentAccountRepository } from "@/ports/payment-account-repository";

describe("getPaymentAccountConnection", () => {
  const mockPaymentAccountRepository = {
    getConnection: vi.fn(),
    startAuthorization: vi.fn(),
  } as unknown as PaymentAccountRepository;

  it("calls getConnection on repository and returns connection details", async () => {
    const mockConnection = {
      status: "connected" as const,
      accountId: "acc-123",
      canReceivePayments: true,
      canSendServiceProposals: true,
    };
    vi.mocked(mockPaymentAccountRepository.getConnection).mockResolvedValue(mockConnection);

    const result = await getPaymentAccountConnection(mockPaymentAccountRepository);

    expect(mockPaymentAccountRepository.getConnection).toHaveBeenCalled();
    expect(result).toEqual(mockConnection);
  });

  it("propagates repository errors", async () => {
    vi.mocked(mockPaymentAccountRepository.getConnection).mockRejectedValue(new Error("API Error"));

    await expect(getPaymentAccountConnection(mockPaymentAccountRepository)).rejects.toThrow("API Error");
  });
});
