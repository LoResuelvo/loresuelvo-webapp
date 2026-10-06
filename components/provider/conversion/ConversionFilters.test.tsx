import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversionFilters } from "./ConversionFilters";
import type { ConversionPeriod } from "@/domain/provider/conversion";
import { t } from "@/infrastructure/i18n/translations";

const period: ConversionPeriod = {
  from: "2026-08-01T00:00:00-03:00",
  to: "2026-08-31T00:00:00-03:00",
  timeZone: "America/Argentina/Buenos_Aires",
};

describe("ConversionFilters", () => {
  it("prevents edits to SSR controls before hydration", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <ConversionFilters period={period} pending={false} onApply={vi.fn()} />
    );
    expect(within(container).getByLabelText(t.providerConversion.from)).toBeDisabled();
    expect(
      within(container).getByRole("button", { name: t.providerConversion.applyFilters })
    ).toBeDisabled();
  });

  it("enables hydrated controls and disables them during pending requests", () => {
    const view = render(
      <ConversionFilters period={period} pending={false} onApply={vi.fn()} />
    );
    expect(screen.getByLabelText(t.providerConversion.from)).toBeEnabled();

    view.rerender(
      <ConversionFilters period={period} pending={true} onApply={vi.fn()} />
    );
    expect(screen.getByLabelText(t.providerConversion.from)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: t.providerConversion.applyFilters })
    ).toBeDisabled();
  });

  it("submits valid date range and calls onApply", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();

    render(<ConversionFilters period={period} pending={false} onApply={handleApply} />);

    const fromInput = screen.getByLabelText(t.providerConversion.from);
    const throughInput = screen.getByLabelText(t.providerConversion.through);
    const submitBtn = screen.getByRole("button", { name: t.providerConversion.applyFilters });

    await user.clear(fromInput);
    await user.type(fromInput, "2026-06-01");
    await user.clear(throughInput);
    await user.type(throughInput, "2026-06-30");

    await user.click(submitBtn);

    expect(handleApply).toHaveBeenCalledWith({
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-07-01T00:00:00-03:00",
    });
  });

  it("displays accessible alert on invalid range and does not call onApply", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();

    render(<ConversionFilters period={period} pending={false} onApply={handleApply} />);

    const fromInput = screen.getByLabelText(t.providerConversion.from);
    const throughInput = screen.getByLabelText(t.providerConversion.through);
    const submitBtn = screen.getByRole("button", { name: t.providerConversion.applyFilters });

    // Inverted range
    await user.clear(fromInput);
    await user.type(fromInput, "2026-08-20");
    await user.clear(throughInput);
    await user.type(throughInput, "2026-08-10");

    await user.click(submitBtn);

    expect(handleApply).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(t.providerConversion.invalidRange);
  });

  it("does not render granularity select or comparison checkbox", () => {
    render(<ConversionFilters period={period} pending={false} onApply={vi.fn()} />);

    expect(screen.queryByLabelText(/agrupación/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
