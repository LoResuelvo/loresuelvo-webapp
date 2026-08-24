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

  it("renders a paid work with its completion report and review", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={
          {
            id: 7,
            name: "Juan",
            surname: "Gómez",
            categoryName: "Plomería",
            profilePhotoUrl: "https://example.com/juan.jpg",
            rating: 4.8,
            reviews: 12,
            workOrders: [
              {
                id: 10,
                scheduledOn: { isoString: "2026-08-20T10:00:00Z" },
                description: "Reparación de cañería en cocina",
                completionReport: {
                  description: "Trabajo finalizado correctamente y verificado.",
                  reportedOn: { isoString: "2026-08-20T12:00:00Z" },
                },
                review: {
                  rating: 5,
                  description: "Excelente servicio, muy puntual y prolijo.",
                },
              },
            ],
          } as never
        }
      />,
    );

    expect(screen.getByRole("heading", { name: /historial de trabajos/i })).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveTextContent("Reparación de cañería en cocina");
    expect(screen.getByRole("heading", { name: /reporte de finalización/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /reseña del consumidor/i })).toBeInTheDocument();
    expect(screen.getByText(/calificación: 5\.0/i)).toBeInTheDocument();
  });

  it("renders an explicit empty state when a work has no review", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={
          {
            id: 7,
            name: "Juan",
            surname: "Gómez",
            categoryName: "Plomería",
            rating: 4.8,
            reviews: 12,
            workOrders: [
              {
                id: 10,
                scheduledOn: { isoString: "2026-08-20T10:00:00Z" },
                description: "Reparación de cañería en cocina",
                completionReport: {
                  description: "Trabajo finalizado correctamente y verificado.",
                  reportedOn: { isoString: "2026-08-20T12:00:00Z" },
                },
              },
            ],
          } as never
        }
      />,
    );

    expect(screen.getByText("Este trabajo todavía no tiene reseña.", { exact: true })).toBeInTheDocument();
  });
});
