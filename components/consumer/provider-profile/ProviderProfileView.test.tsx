import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderProfileView from "./ProviderProfileView";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/consumidor/prestadores/7"),
}));

describe("ProviderProfileView", () => {
  it("renders the provider name, photo and category", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={{
          id: 7,
          name: "Juan",
          surname: "Gómez",
          categoryName: "Plomería",
          profilePhotoUrl: "https://example.com/juan.jpg",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Juan Gómez" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /juan gómez/i })).toHaveAttribute(
      "src",
      "https://example.com/juan.jpg",
    );
    expect(screen.getByText("Plomería")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver al inicio/i })).toHaveAttribute(
      "href",
      "/consumidor/home",
    );
  });
});
