import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderProfileNotFound from "./ProviderProfileNotFound";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/consumidor/prestadores/999"),
}));

describe("ProviderProfileNotFound", () => {
  it("renders not found title, description and back to search link", () => {
    render(<ProviderProfileNotFound />);

    expect(
      screen.getByRole("heading", { name: /perfil no encontrado/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/el prestador solicitado no existe o no está disponible/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /volver a la búsqueda/i }),
    ).toHaveAttribute("href", "/consumidor/buscar");
  });
});
