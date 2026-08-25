import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ProviderProfile,
  ProviderProfileWorkOrder,
} from "@/domain/provider/types";
import ProviderProfileView from "./ProviderProfileView";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/consumidor/prestadores/7"),
}));

function aWorkOrder(overrides: Partial<ProviderProfileWorkOrder> = {}): ProviderProfileWorkOrder {
  return {
    id: 10,
    scheduledOn: { isoString: "2026-08-20T10:00:00Z" },
    description: "Reparación de cañería en cocina",
    completionReport: {
      description: "Trabajo finalizado correctamente y verificado.",
      reportedOn: { isoString: "2026-08-20T12:00:00Z" },
    },
    ...overrides,
  };
}

function aProviderProfile(overrides: Partial<ProviderProfile> = {}): ProviderProfile {
  return {
    id: 7,
    name: "Juan",
    surname: "Gómez",
    categoryName: "Plomería",
    profilePhotoUrl: "https://example.com/juan.jpg",
    rating: 4.8,
    reviews: 12,
    workOrders: [],
    ...overrides,
  };
}

describe("ProviderProfileView", () => {
  it("renders the provider name, photo and category", () => {
    render(<ProviderProfileView session={null} provider={aProviderProfile()} />);

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

  it("renders the public rating summary with decorative stars", () => {
    render(<ProviderProfileView session={null} provider={aProviderProfile()} />);

    expect(screen.getByRole("heading", { name: /reputación/i })).toBeInTheDocument();
    expect(screen.getByText("4.8", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("(12 reseñas)", { exact: true })).toBeInTheDocument();
    const ratingSection = screen.getByRole("region", { name: /reputación/i });
    expect(ratingSection.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("renders an explicit accessible empty state when the provider has no reviews", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={aProviderProfile({ rating: 0, reviews: 0 })}
      />,
    );

    expect(screen.getByText("Este prestador todavía no tiene reseñas.", { exact: true })).toBeInTheDocument();
  });

  it("renders a paid work with its completion report and review", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={aProviderProfile({
          workOrders: [
            aWorkOrder({
              review: {
                rating: 5,
                description: "Excelente servicio, muy puntual y prolijo.",
              },
            }),
          ],
        })}
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
        provider={aProviderProfile({ workOrders: [aWorkOrder()] })}
      />,
    );

    expect(screen.getByText("Este trabajo todavía no tiene reseña.", { exact: true })).toBeInTheDocument();
  });

  it("renders an explicit empty state when the provider has no public work history", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={aProviderProfile({ rating: 0, reviews: 0, workOrders: [] })}
      />,
    );

    expect(screen.getByRole("heading", { name: /historial de trabajos/i })).toBeInTheDocument();
    expect(screen.getByText("Este prestador todavía no tiene historial público.", { exact: true })).toBeInTheDocument();
  });

  it("preserves the work order received from the public profile", () => {
    render(
      <ProviderProfileView
        session={null}
        provider={aProviderProfile({
          workOrders: [
            aWorkOrder({ id: 10, description: "Reparación de cañería" }),
            aWorkOrder({ id: 11, description: "Cambio de grifería" }),
          ],
        })}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Reparación de cañería", "Cambio de grifería"]);
  });
});
