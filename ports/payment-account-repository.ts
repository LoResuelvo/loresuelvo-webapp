import { PaymentAccountConnection, PaymentAccountAuthorization } from "@/domain/payment-account/types";

export interface PaymentAccountRepository {
  getConnection(): Promise<PaymentAccountConnection>;
  startConnection(): Promise<PaymentAccountAuthorization>;
}
