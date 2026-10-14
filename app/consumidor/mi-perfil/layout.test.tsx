import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConsumerProfileLayout from "@/app/consumidor/mi-perfil/layout";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import Sidebar from "@/components/consumer/Sidebar";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/infrastructure/auth", () => ({
  getAuthService: () => ({ getSession: mocks.getSession }),
}));
vi.mock("@/components/consumer/home/ConsumerHeader", () => ({
  default: vi.fn(() => null),
}));
vi.mock("@/components/consumer/Sidebar", () => ({
  default: vi.fn(() => null),
}));

describe("ConsumerProfileLayout", () => {
  it("mantiene la navegación del consumidor alrededor del contenido", async () => {
    mocks.getSession.mockResolvedValue(null);
    const layout = await ConsumerProfileLayout({
      children: <p>Contenido del perfil</p>,
    });

    render(layout);

    expect(screen.getByText("Contenido del perfil")).toBeInTheDocument();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(vi.mocked(Sidebar).mock.calls[0]?.[0]).toEqual({ responsive: true });
    expect(vi.mocked(ConsumerHeader).mock.calls[0]?.[0]).toEqual({
      session: null,
    });
  });
});
