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

  it("does not render private provider data such as email or documents", () => {
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

    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(screen.queryByText(/documento/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dni/i)).not.toBeInTheDocument();
  });

  it("renders the public rating summary with decorative stars", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={{
          id: 7,
          name: "Juan",
          surname: "Gómez",
          categoryName: "Plomería",
          profilePhotoUrl: "https://example.com/juan.jpg",
          rating: 4.8,
          reviews: 12,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: /reputación/i })).toBeInTheDocument();
    expect(screen.getByText("4.8", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("(12 reseñas)", { exact: true })).toBeInTheDocument();
    const ratingSection = screen.getByRole("region", { name: /reputación/i });
    expect(ratingSection.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});
