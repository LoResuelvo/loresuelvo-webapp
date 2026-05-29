export const ROUTES = {
  home: "/",
  auth: {
    login: "/auth/login",
    signup: "/auth/login?screen_hint=signup",
    logout: "/auth/logout",
  },
  onboarding: "/onboarding",
  consumer: {
    home: "/consumer/home",
    buscar: "/consumer/buscar",
  },
  provider: {
    home: "/prestador/home",
    calendar: "/prestador/calendario",
    messages: "/prestador/mensajes",
    jobs: "/prestador/trabajos",
    profile: "/prestador/perfil",
  }
};
