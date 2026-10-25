export const ROUTES = {
  home: "/",
  me: "/me",
  auth: {
    login: "/auth/login",
    signup: "/auth/login?screen_hint=signup",
    logout: "/auth/logout",
  },
  onboarding: "/onboarding",
  onboardingStages: {
    identity: "identity",
    mercadoPago: "mercado-pago",
  },
  onboardingIdentityVerificationReturn: "/onboarding/identity-verification/return",
  payments: {
    success: "/payments/success",
    pending: "/payments/pending",
    failure: "/payments/failure",
  },
  consumer: {
    home: "/consumidor/home",
    buscar: "/consumidor/buscar",
    messages: "/consumidor/mensajes",
    aiMessages: "/consumidor/mensajes-ia",
    diagnostico: "/consumidor/diagnostico",
    services: "/consumidor/mis-servicios",
    claims: "/consumidor/mis-reclamos",
    profile: "/consumidor/mi-perfil",
    providerProfile: (providerId: number | string) => `/consumidor/prestadores/${providerId}`,
  },
  provider: {
    activity: "/prestador/mi-desempeno/actividad",
    collections: "/prestador/mi-desempeno/cobros",
    reputation: "/prestador/mi-desempeno/reputacion",
    conversion: "/prestador/mi-desempeno/conversion",
    home: "/prestador/home",
    messages: "/prestador/mensajes",
    jobs: "/prestador/trabajos",
    claims: "/prestador/mis-reclamos",
    profile: "/prestador/mi-perfil",
    mercadoPagoCallback: "/provider/register/mercado-pago",
  }
};
