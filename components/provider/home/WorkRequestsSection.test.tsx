import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkRequestsSection from "./WorkRequestsSection";
import { ProviderWorkRequest } from "@/lib/provider-home/types";

const mockWorkRequests: ProviderWorkRequest[] = [
  {
    id: "request-1",
    clientName: "María Fernández",
    problemTitle: "Cortocircuito en cocina",
    category: "Electricidad",
    description: "Se saltó la térmica al encender el horno eléctrico. Necesito que alguien lo revise urgente.",
    location: "Palermo, CABA",
    publishedAtLabel: "Hace 20 min",
    unreadMessagesCount: 0,
  },
  {
    id: "request-2",
    clientName: "Javier Torres",
    problemTitle: "Instalación de luminarias",
    category: "Electricidad",
    description: "Busco instalar tres luces nuevas en el living.",
    location: "Caballito, CABA",
    publishedAtLabel: "Hace 1 h",
    unreadMessagesCount: 0,
  },
];

describe("WorkRequestsSection", () => {
  it("shows empty state message when there are no work requests", () => {
    render(<WorkRequestsSection requests={[]} />);

    const section = screen.getByRole("region", { name: "Solicitudes de Trabajo" });
    expect(within(section).getByText("Todavía no tienes ninguna solicitud de trabajo :(")).toBeInTheDocument();
  });

  it("renders work requests with the expected details and actions", () => {
    render(<WorkRequestsSection requests={mockWorkRequests} />);

    const section = screen.getByRole("region", { name: "Solicitudes de Trabajo" });
    const list = within(section).getByRole("list", { name: "Lista de solicitudes de trabajo" });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);

    const firstRequest = items[0];
    expect(within(firstRequest).getByText("María Fernández")).toBeInTheDocument();
    expect(within(firstRequest).getByText("Cortocircuito en cocina")).toBeInTheDocument();
    expect(within(firstRequest).getByText("Se saltó la térmica al encender el horno eléctrico. Necesito que alguien lo revise urgente.")).toBeInTheDocument();
    expect(within(firstRequest).getByText("Palermo, CABA")).toBeInTheDocument();
    expect(within(firstRequest).getByText("Hace 20 min")).toBeInTheDocument();
    expect(within(firstRequest).getByRole("button", { name: "Ver Solicitud" })).toBeInTheDocument();
  });
});