import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderProfileLayout from "@/app/prestador/mi-perfil/layout";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/infrastructure/auth", () => ({
  getAuthService: () => ({ getSession: mocks.getSession }),
}));
vi.mock("@/components/provider/home/layout/ProviderHeader", () => ({
  default: vi.fn(() => null),
}));
vi.mock("@/components/provider/home/layout/ProviderSidebar", () => ({
  default: vi.fn(() => null),
}));

describe("ProviderProfileLayout", () => {
  it("mantiene la navegación del prestador alrededor del contenido", async () => {
    mocks.getSession.mockResolvedValue(null);
    const layout = await ProviderProfileLayout({
      children: <p>Contenido del perfil</p>,
    });

    render(layout);

    expect(screen.getByText("Contenido del perfil")).toBeInTheDocument();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(vi.mocked(ProviderSidebar).mock.calls[0]?.[0]).toEqual({
      responsive: true,
    });
    expect(vi.mocked(ProviderHeader).mock.calls[0]?.[0]).toEqual({
      session: null,
    });
  });
});
