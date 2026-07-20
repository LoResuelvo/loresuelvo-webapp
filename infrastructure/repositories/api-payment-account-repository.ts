import { api } from "@/infrastructure/api/base-client";
import { PaymentAccountRepository } from "@/ports/payment-account-repository";
import { PaymentAccountConnection, PaymentAccountAuthorization } from "@/domain/payment-account/types";
import { ApiPaymentAccountConnection, ApiPaymentAccountAuthorization } from "@/infrastructure/api/types";
import { mapApiToPaymentAccountConnection, mapApiToPaymentAccountAuthorization } from "./payment-account-mapper";

export class ApiPaymentAccountRepository implements PaymentAccountRepository {
  async getConnection(): Promise<PaymentAccountConnection> {
    const res = await api.get<ApiPaymentAccountConnection>("/providers/me/payment-accounts");
    return mapApiToPaymentAccountConnection(res);
  }

  async startAuthorization(): Promise<PaymentAccountAuthorization> {
    const res = await api.post<ApiPaymentAccountAuthorization>("/providers/me/payment-accounts/authorization", {});
    return mapApiToPaymentAccountAuthorization(res);
  }
}
