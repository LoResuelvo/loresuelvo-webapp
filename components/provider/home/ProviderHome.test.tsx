import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProviderHome from "./ProviderHome";
import { ProviderWorkRequest } from "@/lib/provider-home/types";

const mockSession = {
  user: {
    id: "provider-1",
    email: "prestador@loresuelvo.test",
    firstName: "Paula",
    lastName: "Rios",
  },
};

const mockWorkRequests: ProviderWorkRequest[] = [
  {
    id: "request-1",
    clientName: "María Fernández",
    problemTitle: "Pérdida de agua en cocina",
    summary: "Necesita reparar una pérdida debajo de la bacha.",
    location: "Palermo, CABA",
    publishedAtLabel: "Hace 20 min",
  },
];

describe("ProviderHome", () => {
  it("renders the provider navigation sidebar", () => {
    render(<ProviderHome session={mockSession} workRequests={[]} />);

    const navigation = screen.getByRole("navigation", {
      name: "Navegación del prestador",
    });

    expect(within(navigation).getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Calendario" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Mensajes" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Trabajos" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Perfil" })).toBeInTheDocument();
  });

  it("renders work requests with the expected details and actions", () => {
    render(<ProviderHome session={mockSession} workRequests={mockWorkRequests} />);

    const section = screen.getByRole("region", { name: "Solicitudes de Trabajo" });
    const request = within(section).getByRole("listitem");

    expect(within(section).getByRole("list", { name: "Lista de solicitudes de trabajo" })).toBeInTheDocument();
    expect(within(request).getByText("María Fernández")).toBeInTheDocument();
    expect(within(request).getByText("Pérdida de agua en cocina")).toBeInTheDocument();
    expect(within(request).getByText("Necesita reparar una pérdida debajo de la bacha.")).toBeInTheDocument();
    expect(within(request).getByText("Palermo, CABA")).toBeInTheDocument();
    expect(within(request).getByText("Hace 20 min")).toBeInTheDocument();
    expect(within(request).getByRole("button", { name: "Responder" })).toBeInTheDocument();
    expect(within(request).getByRole("button", { name: "Detalles" })).toBeInTheDocument();
  });
});
