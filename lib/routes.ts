export const ROUTES = {
  home: "/",
  auth: {
    login: "/auth/login",
    signup: "/auth/login?screen_hint=signup",
    logout: "/auth/logout",
  },
  onboarding: "/onboarding",
  consumer: {
    home: "/consumidor/home",
    buscar: "/consumidor/buscar",
    messages: "/consumidor/mensajes",
    aiMessages: "/consumidor/mensajes-ia",
    diagnostico: "/consumidor/diagnostico",
    services: "/consumidor/mis-servicios",
  },
  provider: {
    home: "/prestador/home",
    calendar: "/prestador/calendario",
    messages: "/prestador/mensajes",
    jobs: "/prestador/trabajos",
    profile: "/prestador/perfil",
    mercadoPagoCallback: "/provider/register/mercado-pago",
  }
};
