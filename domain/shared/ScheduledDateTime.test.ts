import { describe, expect, it } from "vitest";
import { ScheduledDateTime } from "./ScheduledDateTime";

describe("ScheduledDateTime Value Object", () => {
  describe("create", () => {
    it("creates a valid ScheduledDateTime instance from valid ISO string", () => {
      const iso = "2026-07-05T12:30:00.000Z";
      const sdt = ScheduledDateTime.create(iso);
      expect(sdt.isoString).toBe(iso);
    });

    it("creates a valid ScheduledDateTime instance from Date object or ISO string without milliseconds", () => {
      const iso = "2026-07-05T12:30:00Z";
      const sdt = ScheduledDateTime.create(iso);
      expect(sdt.isoString).toBe("2026-07-05T12:30:00Z");

      const fromDate = ScheduledDateTime.create(new Date(iso));
      expect(fromDate.isoString).toBe(new Date(iso).toISOString());
    });

    it("throws error for empty string", () => {
      expect(() => ScheduledDateTime.create("")).toThrow("ScheduledDateTime requires a valid non-empty date string");
    });

    it("throws error for invalid date string", () => {
      expect(() => ScheduledDateTime.create("invalid-date-format")).toThrow("Invalid date string");
    });
  });

  describe("formatting", () => {
    it("formatWithTime formats date and time with hs suffix", () => {
      const sdt = ScheduledDateTime.create("2026-07-05T12:30:00Z");
      const formatted = ScheduledDateTime.formatWithTime(sdt);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2} hs/);
    });

    it("formatDateOnly formats date as DD/MM/YYYY", () => {
      const sdt = ScheduledDateTime.create("2026-07-05T12:30:00Z");
      const formatted = ScheduledDateTime.formatDateOnly(sdt);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it("formatTimeOnly formats time as HH:mm hs", () => {
      const sdt = ScheduledDateTime.create("2026-07-05T12:30:00Z");
      const formatted = ScheduledDateTime.formatTimeOnly(sdt);
      expect(formatted).toMatch(/\d{2}:\d{2} hs/);
    });

    it("formatRawTime formats time as HH:mm without hs", () => {
      const sdt = ScheduledDateTime.create("2026-07-05T12:30:00Z");
      const formatted = ScheduledDateTime.formatRawTime(sdt);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe("temporal comparisons", () => {
    it("determines if date is in the past", () => {
      const past = ScheduledDateTime.create("2020-01-01T00:00:00Z");
      const future = ScheduledDateTime.create("2099-01-01T00:00:00Z");
      const referenceNow = new Date("2026-01-01T00:00:00Z");

      expect(ScheduledDateTime.isPast(past, referenceNow)).toBe(true);
      expect(ScheduledDateTime.isPast(future, referenceNow)).toBe(false);
    });

    it("determines if date is in the future", () => {
      const past = ScheduledDateTime.create("2020-01-01T00:00:00Z");
      const future = ScheduledDateTime.create("2099-01-01T00:00:00Z");
      const referenceNow = new Date("2026-01-01T00:00:00Z");

      expect(ScheduledDateTime.isFuture(future, referenceNow)).toBe(true);
      expect(ScheduledDateTime.isFuture(past, referenceNow)).toBe(false);
    });

    it("compares two ScheduledDateTime instances", () => {
      const t1 = ScheduledDateTime.create("2026-07-01T00:00:00Z");
      const t2 = ScheduledDateTime.create("2026-07-05T00:00:00Z");
      const t3 = ScheduledDateTime.create("2026-07-01T00:00:00Z");

      expect(ScheduledDateTime.compare(t1, t2)).toBeLessThan(0);
      expect(ScheduledDateTime.compare(t2, t1)).toBeGreaterThan(0);
      expect(ScheduledDateTime.compare(t1, t3)).toBe(0);
      expect(ScheduledDateTime.equals(t1, t3)).toBe(true);
      expect(ScheduledDateTime.equals(t1, t2)).toBe(false);
    });

    it("converts to native Date", () => {
      const iso = "2026-07-05T12:30:00.000Z";
      const sdt = ScheduledDateTime.create(iso);
      expect(ScheduledDateTime.toDate(sdt).getTime()).toBe(new Date(iso).getTime());
    });
  });
});
