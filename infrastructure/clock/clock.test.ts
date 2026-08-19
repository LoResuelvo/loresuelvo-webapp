import { describe, expect, it } from "vitest";
import { SystemClock } from "./system-clock";
import { FixedClock } from "./fixed-clock";
import { SimulatedClock } from "./simulated-clock";

describe("Clock Adapters", () => {
  describe("SystemClock", () => {
    it("returns current system date", () => {
      const clock = new SystemClock();
      const before = Date.now();
      const now = clock.now().getTime();
      const after = Date.now();

      expect(now).toBeGreaterThanOrEqual(before);
      expect(now).toBeLessThanOrEqual(after);
    });
  });

  describe("FixedClock", () => {
    it("returns the exact fixed date provided", () => {
      const fixedIso = "2026-09-04T12:00:00.000Z";
      const clock = new FixedClock(fixedIso);

      expect(clock.now().toISOString()).toBe(fixedIso);
      expect(clock.now().getTime()).toBe(new Date(fixedIso).getTime());
    });

    it("returns a new Date instance on each call to prevent mutation", () => {
      const clock = new FixedClock("2026-09-04T12:00:00.000Z");
      const d1 = clock.now();
      const d2 = clock.now();

      expect(d1).not.toBe(d2);
      expect(d1.getTime()).toBe(d2.getTime());
    });
  });

  describe("SimulatedClock", () => {
    it("returns system time when no simulated date is set", () => {
      const clock = new SimulatedClock();
      expect(clock.isSimulated()).toBe(false);
      expect(clock.getSimulatedDate()).toBeNull();

      const before = Date.now();
      const now = clock.now().getTime();
      const after = Date.now();

      expect(now).toBeGreaterThanOrEqual(before);
      expect(now).toBeLessThanOrEqual(after);
    });

    it("returns simulated date when set with setTime", () => {
      const clock = new SimulatedClock();
      const simulatedIso = "2026-10-15T08:30:00.000Z";

      clock.setTime(simulatedIso);

      expect(clock.isSimulated()).toBe(true);
      expect(clock.now().toISOString()).toBe(simulatedIso);
      expect(clock.getSimulatedDate()?.toISOString()).toBe(simulatedIso);
    });

    it("resets to system time when reset is called", () => {
      const clock = new SimulatedClock("2026-10-15T08:30:00.000Z");
      expect(clock.isSimulated()).toBe(true);

      clock.reset();

      expect(clock.isSimulated()).toBe(false);
      expect(clock.getSimulatedDate()).toBeNull();
    });
  });
});
