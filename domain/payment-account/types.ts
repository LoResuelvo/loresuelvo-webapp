export type PaymentAccountStatus = "pending" | "connected";

export interface PaymentAccountConnection {
  status: PaymentAccountStatus;
  accountId?: string;
  canReceivePayments: boolean;
  canSendServiceProposals: boolean;
}

export interface PaymentAccountAuthorization {
  authorizationUrl: string;
  state: string;
}
