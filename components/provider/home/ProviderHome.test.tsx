import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProviderHome from "./ProviderHome";

const mockSession = {
  user: {
    id: "provider-1",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
  },
};

describe("ProviderHome", () => {
  it("renders the provider navigation sidebar", () => {
    render(<ProviderHome session={mockSession} workRequests={[]} scheduledJobs={[]} />);

    const navigation = screen.getByRole("navigation", {
      name: "Navegación del prestador",
    });

    expect(within(navigation).getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Calendario" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Mensajes" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Trabajos" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Perfil" })).toBeInTheDocument();
  });

  it("shows empty state message when there are no work requests", () => {
    render(<ProviderHome session={mockSession} workRequests={[]} scheduledJobs={[]} />);

    const section = screen.getByRole("region", { name: "Solicitudes de Trabajo" });
    expect(within(section).getByText("Todavía no tienes ninguna solicitud de trabajo :(")).toBeInTheDocument();
  });

  it("shows empty state message when there are no scheduled jobs", () => {
    render(<ProviderHome session={mockSession} workRequests={[]} scheduledJobs={[]} />);

    const section = screen.getByRole("region", { name: "Trabajos Agendados" });
    expect(within(section).getByText("No tienes trabajos agendados")).toBeInTheDocument();
  });
});
