import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoverageZoneSelector } from "./CoverageZoneSelector";
import { t } from "@/infrastructure/i18n/translations";

const mockZones = [
  { id: 6, name: "Comuna 6" },
  { id: 14, name: "Comuna 14" },
];

describe("CoverageZoneSelector", () => {
  it("renders loading state when isLoading is true", () => {
    render(<CoverageZoneSelector zones={[]} isLoading={true} />);

    expect(screen.getByTestId("coverage-zones-loading")).toBeInTheDocument();
    expect(screen.getByText(t.onboarding.coverageZones.loading)).toBeInTheDocument();
  });

  it("renders available zones in ready state with accessible list and map", () => {
    render(<CoverageZoneSelector zones={mockZones} selectedZoneIds={[]} />);

    const list = screen.getByTestId("coverage-zones-list");
    expect(within(list).getByText("Comuna 6")).toBeInTheDocument();
    expect(within(list).getByText("Comuna 14")).toBeInTheDocument();
    expect(screen.getByTestId("coverage-map")).toBeInTheDocument();
  });

  it("calls onToggleZone when a zone is clicked", () => {
    const onToggleZone = vi.fn();
    render(<CoverageZoneSelector zones={mockZones} selectedZoneIds={[]} onToggleZone={onToggleZone} />);

    const checkbox = screen.getByRole("checkbox", { name: "Comuna 6" });
    fireEvent.click(checkbox);

    expect(onToggleZone).toHaveBeenCalledWith(6);
  });

  it("renders empty state when zones list is empty", () => {
    render(<CoverageZoneSelector zones={[]} isLoading={false} />);

    expect(screen.getByTestId("coverage-zones-empty")).toBeInTheDocument();
    expect(screen.getByText(t.onboarding.coverageZones.emptyMessage)).toBeInTheDocument();
  });

  it("renders error state and triggers onRetry", () => {
    const onRetry = vi.fn();
    render(<CoverageZoneSelector zones={[]} error="Error al cargar" onRetry={onRetry} />);

    expect(screen.getByTestId("coverage-zones-error")).toBeInTheDocument();
    expect(screen.getByText("Error al cargar")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: t.onboarding.coverageZones.retryButton });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders validation error with alert role when provided", () => {
    render(
      <CoverageZoneSelector
        zones={mockZones}
        selectedZoneIds={[]}
        validationError="Debes seleccionar al menos una zona de cobertura"
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Debes seleccionar al menos una zona de cobertura");
  });

  it("calls onToggleZone when a map zone button is clicked", () => {
    const onToggleZone = vi.fn();
    render(<CoverageZoneSelector zones={mockZones} selectedZoneIds={[]} onToggleZone={onToggleZone} />);

    const mapZone = screen.getByTestId("map-zone-14");
    fireEvent.click(mapZone);

    expect(onToggleZone).toHaveBeenCalledWith(14);
  });

  it("reflects selected state on map zone button when selectedZoneIds includes zone id", () => {
    render(<CoverageZoneSelector zones={mockZones} selectedZoneIds={[14]} />);

    const mapZone14 = screen.getByTestId("map-zone-14");
    expect(mapZone14).toHaveAttribute("data-selected", "true");
    expect(mapZone14).toHaveAttribute("aria-pressed", "true");

    const mapZone6 = screen.getByTestId("map-zone-6");
    expect(mapZone6).toHaveAttribute("data-selected", "false");
    expect(mapZone6).toHaveAttribute("aria-pressed", "false");
  });
});
