import { ApiPaymentAccountConnection, ApiPaymentAccountAuthorization } from "@/infrastructure/api/types";
import { PaymentAccountConnection, PaymentAccountAuthorization, PaymentAccountStatus } from "@/domain/payment-account/types";

export function mapApiToPaymentAccountConnection(api: ApiPaymentAccountConnection): PaymentAccountConnection {
  return {
    status: api.status as PaymentAccountStatus,
    accountId: api.account_id,
    canReceivePayments: api.can_receive_payments,
    canSendServiceProposals: api.can_send_service_proposals,
  };
}

export function mapApiToPaymentAccountAuthorization(api: ApiPaymentAccountAuthorization): PaymentAccountAuthorization {
  return {
    authorizationUrl: api.authorization_url,
    state: api.state,
  };
}
