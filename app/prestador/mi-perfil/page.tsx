import ProfileView from "@/components/profile/ProfileView";
import { parseCalendarCallbackResult } from "@/app/profile/calendar-result";
import { parseMercadoPagoCallbackResult } from "@/app/profile/mercado-pago-result";
import { getAuthenticatedProfile } from "@/app/profile/profile-page-data";
import { getPaymentAccountConnection } from "@/application/onboarding/get-payment-account-connection";
import type { PaymentAccountConnection } from "@/domain/payment-account/types";
import { ApiPaymentAccountRepository } from "@/infrastructure/repositories/payments/api-payment-account-repository";

interface ProviderProfilePageProps {
  searchParams: Promise<{
    calendar_result?: string | string[];
    mercado_pago_result?: string | string[];
  }>;
}

export default async function ProviderProfilePage({
  searchParams,
}: ProviderProfilePageProps) {
  const params = await searchParams;
  const user = await getAuthenticatedProfile();
  let paymentAccountConnection: PaymentAccountConnection | null = null;

  if (user.role === "provider") {
    try {
      paymentAccountConnection = await getPaymentAccountConnection(
        new ApiPaymentAccountRepository(),
      );
    } catch {
      paymentAccountConnection = null;
    }
  }

  return (
    <ProfileView
      user={user}
      calendarResult={parseCalendarCallbackResult(params.calendar_result)}
      mercadoPagoResult={parseMercadoPagoCallbackResult(params.mercado_pago_result)}
      paymentAccountConnection={paymentAccountConnection}
    />
  );
}
