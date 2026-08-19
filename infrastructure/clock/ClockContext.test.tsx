import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClockProvider, useClock } from "./ClockContext";
import * as testClockActions from "@/app/test-clock/actions";

vi.mock("@/app/test-clock/actions", () => ({
  setApiClockAction: vi.fn().mockResolvedValue({ ok: true }),
  clearApiClockAction: vi.fn().mockResolvedValue({ ok: true }),
}));

function TestConsumer() {
  const { now, isSimulated, simulatedDate, setTime, resetTime } = useClock();

  return (
    <div>
      <span data-testid="now-iso">{now().toISOString()}</span>
      <span data-testid="is-simulated">{isSimulated ? "yes" : "no"}</span>
      <span data-testid="simulated-date">{simulatedDate?.toISOString() || "none"}</span>
      <button
        onClick={() => setTime("2026-11-20T15:00:00.000Z")}
        data-testid="btn-set-time"
      >
        Set Time
      </button>
      <button onClick={() => resetTime()} data-testid="btn-reset-time">
        Reset Time
      </button>
    </div>
  );
}

describe("ClockProvider and useClock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides system time when not simulated", () => {
    render(
      <ClockProvider>
        <TestConsumer />
      </ClockProvider>
    );

    expect(screen.getByTestId("is-simulated")).toHaveTextContent("no");
    expect(screen.getByTestId("simulated-date")).toHaveTextContent("none");
  });

  it("provides initial date when passed as prop", () => {
    const initialIso = "2026-10-01T10:00:00.000Z";
    render(
      <ClockProvider initialDate={initialIso}>
        <TestConsumer />
      </ClockProvider>
    );

    expect(screen.getByTestId("is-simulated")).toHaveTextContent("yes");
    expect(screen.getByTestId("now-iso")).toHaveTextContent(initialIso);
    expect(screen.getByTestId("simulated-date")).toHaveTextContent(initialIso);
  });

  it("updates simulated time and calls setApiClockAction on setTime", async () => {
    const user = userEvent.setup();
    render(
      <ClockProvider>
        <TestConsumer />
      </ClockProvider>
    );

    const btnSet = screen.getByTestId("btn-set-time");
    await user.click(btnSet);

    expect(screen.getByTestId("is-simulated")).toHaveTextContent("yes");
    expect(screen.getByTestId("now-iso")).toHaveTextContent("2026-11-20T15:00:00.000Z");
    expect(testClockActions.setApiClockAction).toHaveBeenCalledWith(
      "2026-11-20T15:00:00.000Z"
    );
  });

  it("resets simulated time and calls clearApiClockAction on resetTime", async () => {
    const user = userEvent.setup();
    render(
      <ClockProvider initialDate="2026-11-20T15:00:00.000Z">
        <TestConsumer />
      </ClockProvider>
    );

    expect(screen.getByTestId("is-simulated")).toHaveTextContent("yes");

    const btnReset = screen.getByTestId("btn-reset-time");
    await user.click(btnReset);

    expect(screen.getByTestId("is-simulated")).toHaveTextContent("no");
    expect(screen.getByTestId("simulated-date")).toHaveTextContent("none");
    expect(testClockActions.clearApiClockAction).toHaveBeenCalled();
  });

  it("returns fallback system clock when used outside ClockProvider", () => {
    render(<TestConsumer />);

    expect(screen.getByTestId("is-simulated")).toHaveTextContent("no");
    expect(screen.getByTestId("simulated-date")).toHaveTextContent("none");
  });
});
