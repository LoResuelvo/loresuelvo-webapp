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
    render(<ProviderHome session={mockSession} />);

    const navigation = screen.getByRole("navigation", {
      name: "Navegación del prestador",
    });

    expect(within(navigation).getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Calendario" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Mensajes" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Trabajos" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Perfil" })).toBeInTheDocument();
  });
});
