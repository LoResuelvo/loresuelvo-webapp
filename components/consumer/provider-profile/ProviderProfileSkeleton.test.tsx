import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderProfileSkeleton from "./ProviderProfileSkeleton";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/consumidor/prestadores/1"),
}));

describe("ProviderProfileSkeleton", () => {
  it("renders with aria-busy and accessible loading text", () => {
    render(<ProviderProfileSkeleton />);

    const skeleton = screen.getByTestId("provider-profile-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Cargando perfil del prestador...")).toBeInTheDocument();
  });
});
