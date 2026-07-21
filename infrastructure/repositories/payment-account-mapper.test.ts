import { describe, expect, it } from "vitest";
import { mapApiToPaymentAccountConnection, mapApiToPaymentAccountAuthorization } from "./payment-account-mapper";
import { ApiPaymentAccountConnection, ApiPaymentAccountAuthorization } from "@/infrastructure/api/types";

describe("PaymentAccountMapper", () => {
  it("maps ApiPaymentAccountConnection to PaymentAccountConnection correctly", () => {
    const apiConnection: ApiPaymentAccountConnection = {
      status: "connected",
      account_id: "mp-123",
      can_receive_payments: true,
      can_send_service_proposals: true,
    };

    const domainConnection = mapApiToPaymentAccountConnection(apiConnection);

    expect(domainConnection).toEqual({
      status: "connected",
      accountId: "mp-123",
      canReceivePayments: true,
      canSendServiceProposals: true,
    });
  });

  it("maps ApiPaymentAccountConnection with missing account_id correctly", () => {
    const apiConnection: ApiPaymentAccountConnection = {
      status: "pending",
      can_receive_payments: false,
      can_send_service_proposals: false,
    };

    const domainConnection = mapApiToPaymentAccountConnection(apiConnection);

    expect(domainConnection).toEqual({
      status: "pending",
      accountId: undefined,
      canReceivePayments: false,
      canSendServiceProposals: false,
    });
  });

  it("maps ApiPaymentAccountAuthorization to PaymentAccountAuthorization correctly", () => {
    const apiAuthorization: ApiPaymentAccountAuthorization = {
      authorization_url: "https://auth.mercadopago.com/auth-url",
      state: "random-state",
    };

    const domainAuthorization = mapApiToPaymentAccountAuthorization(apiAuthorization);

    expect(domainAuthorization).toEqual({
      authorizationUrl: "https://auth.mercadopago.com/auth-url",
      state: "random-state",
    });
  });
});
