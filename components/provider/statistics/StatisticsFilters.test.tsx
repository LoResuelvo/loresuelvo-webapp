import { render, within, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StatisticsFilters } from "./StatisticsFilters";
import type { StatisticsPeriod } from "@/domain/provider/statistics-period";
const period: StatisticsPeriod = { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", timeZone: "America/Argentina/Buenos_Aires" };
describe("StatisticsFilters interactivity", () => {
  it("prevents edits to SSR controls before their handlers are ready", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<StatisticsFilters period={period} pending={false} title="Filtros de actividad" onApply={vi.fn()} />);
    expect(within(container).getByLabelText("Desde")).toBeDisabled();
    expect(within(container).getByRole("button", { name: "Aplicar filtros" })).toBeDisabled();
  });
  it("enables hydrated controls and disables them during requests", () => {
    const view = render(<StatisticsFilters period={period} pending={false} title="Filtros de actividad" onApply={vi.fn()} />);
    expect(screen.getByLabelText("Desde")).toBeEnabled();
    view.rerender(<StatisticsFilters period={period} pending={true} title="Filtros de actividad" onApply={vi.fn()} />);
    expect(screen.getByLabelText("Desde")).toBeDisabled();
  });
});
