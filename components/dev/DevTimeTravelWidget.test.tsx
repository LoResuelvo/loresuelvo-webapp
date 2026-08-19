import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DevTimeTravelWidget } from "./DevTimeTravelWidget";
import { ClockProvider } from "@/infrastructure/clock/ClockContext";
import * as testClockActions from "@/app/test-clock/actions";

vi.mock("@/app/test-clock/actions", () => ({
  setApiClockAction: vi.fn().mockResolvedValue({ ok: true }),
  clearApiClockAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("DevTimeTravelWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders closed minimalist button", () => {
    render(
      <ClockProvider>
        <DevTimeTravelWidget />
      </ClockProvider>
    );

    const toggleBtn = screen.getByTestId("widget-toggle-btn");
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-label", "Abrir reloj");
  });

  it("opens panel when toggle button is clicked with digital time and compact chips", async () => {
    const user = userEvent.setup();
    render(
      <ClockProvider>
        <DevTimeTravelWidget />
      </ClockProvider>
    );

    await user.click(screen.getByTestId("widget-toggle-btn"));

    expect(screen.getByTestId("widget-current-time")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avanzar 1 hora/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avanzar 1 día/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avanzar 1 semana/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retroceder 1 hora/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retroceder 1 día/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retroceder 1 semana/i })).toBeInTheDocument();
  });

  it("advances and rewinds time when quick segmented chips are clicked", async () => {
    const user = userEvent.setup();
    render(
      <ClockProvider initialDate="2026-08-20T10:00:00.000Z">
        <DevTimeTravelWidget />
      </ClockProvider>
    );

    await user.click(screen.getByTestId("widget-toggle-btn"));

    const advanceDayBtn = screen.getByRole("button", { name: /avanzar 1 día/i });
    await user.click(advanceDayBtn);
    expect(testClockActions.setApiClockAction).toHaveBeenCalled();

    const rewindHourBtn = screen.getByRole("button", { name: /retroceder 1 hora/i });
    await user.click(rewindHourBtn);
    expect(testClockActions.setApiClockAction).toHaveBeenCalledTimes(2);
  });

  it("resets simulated time when reset icon is clicked in simulated mode", async () => {
    const user = userEvent.setup();
    render(
      <ClockProvider initialDate="2026-08-20T10:00:00.000Z">
        <DevTimeTravelWidget />
      </ClockProvider>
    );

    await user.click(screen.getByTestId("widget-toggle-btn"));

    const resetBtn = screen.getByTestId("widget-reset-btn");
    await user.click(resetBtn);

    expect(testClockActions.clearApiClockAction).toHaveBeenCalled();
  });
});
