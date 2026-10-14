import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { t } from "@/infrastructure/i18n/translations";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/prestador/mi-perfil",
}));

describe("ProviderSidebar", () => {
  it("deja Mi Perfil fuera de la navegación y sin una opción activa", () => {
    render(<ProviderSidebar />);

    expect(
      screen.queryByRole("link", { name: t.sidebar.profile }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page"),
    ).toHaveLength(0);
  });
});
