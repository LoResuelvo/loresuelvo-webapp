import { describe, expect, it } from "vitest";
import { Duration, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES } from "./Duration";

describe("Duration Value Object", () => {
  describe("create", () => {
    it("creates a valid frozen duration object", () => {
      const duration = Duration.create(60);
      expect(duration.minutes).toBe(60);
      expect(Object.isFrozen(duration)).toBe(true);
    });

    it("accepts minimum duration (15 minutes)", () => {
      const duration = Duration.create(MIN_DURATION_MINUTES);
      expect(duration.minutes).toBe(15);
    });

    it("accepts maximum duration (1440 minutes / 24 hours)", () => {
      const duration = Duration.create(MAX_DURATION_MINUTES);
      expect(duration.minutes).toBe(1440);
    });

    it("throws error for non-integer values", () => {
      expect(() => Duration.create(15.5)).toThrow("Duration requires an integer number of minutes");
    });

    it("throws error for duration below 15 minutes", () => {
      expect(() => Duration.create(14)).toThrow("Duration must be between 15 and 1440 minutes");
    });

    it("throws error for duration above 1440 minutes", () => {
      expect(() => Duration.create(1441)).toThrow("Duration must be between 15 and 1440 minutes");
    });
  });

  describe("isValid", () => {
    it("returns true for valid durations", () => {
      expect(Duration.isValid(15)).toBe(true);
      expect(Duration.isValid(90)).toBe(true);
      expect(Duration.isValid(1440)).toBe(true);
    });

    it("returns false for invalid durations", () => {
      expect(Duration.isValid(14)).toBe(false);
      expect(Duration.isValid(1441)).toBe(false);
      expect(Duration.isValid(30.5)).toBe(false);
      expect(Duration.isValid("60")).toBe(false);
      expect(Duration.isValid(null)).toBe(false);
    });
  });

  describe("format", () => {
    it("formats minutes only when less than 1 hour", () => {
      expect(Duration.format(15)).toBe("15 min");
      expect(Duration.format(45)).toBe("45 min");
    });

    it("formats exact hours without remaining minutes", () => {
      expect(Duration.format(60)).toBe("1 h");
      expect(Duration.format(120)).toBe("2 h");
      expect(Duration.format(1440)).toBe("24 h");
    });

    it("formats hours and minutes combined", () => {
      expect(Duration.format(90)).toBe("1 h 30 min");
      expect(Duration.format(75)).toBe("1 h 15 min");
      expect(Duration.format(150)).toBe("2 h 30 min");
    });

    it("accepts Duration object instance", () => {
      const duration = Duration.create(90);
      expect(Duration.format(duration)).toBe("1 h 30 min");
    });

    it("returns empty string for null, undefined or non-positive values", () => {
      expect(Duration.format(null)).toBe("");
      expect(Duration.format(undefined)).toBe("");
      expect(Duration.format(0)).toBe("");
      expect(Duration.format(-10)).toBe("");
    });
  });
});
