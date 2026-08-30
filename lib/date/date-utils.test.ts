import { describe, expect, it } from "vitest";
import { formatConversationLastMessageDate } from "./date-utils";

describe("formatConversationLastMessageDate", () => {
  // Fixed reference date: Wednesday, August 26, 2026 at 15:30:00
  const referenceDate = new Date("2026-08-26T15:30:00");

  it("returns empty string when input is null, undefined or empty", () => {
    expect(formatConversationLastMessageDate(null, referenceDate)).toBe("");
    expect(formatConversationLastMessageDate(undefined, referenceDate)).toBe("");
    expect(formatConversationLastMessageDate("", referenceDate)).toBe("");
  });

  it("returns empty string when date is invalid", () => {
    expect(formatConversationLastMessageDate("invalid-date", referenceDate)).toBe("");
  });

  it("returns only HH:mm for messages from today", () => {
    const todayMorning = new Date("2026-08-26T05:52:00");
    expect(formatConversationLastMessageDate(todayMorning, referenceDate)).toBe("05:52");

    const todayAfternoon = new Date("2026-08-26T14:30:00");
    expect(formatConversationLastMessageDate(todayAfternoon, referenceDate)).toBe("14:30");

    const todayNight = new Date("2026-08-26T23:59:00");
    expect(formatConversationLastMessageDate(todayNight, referenceDate)).toBe("23:59");
  });

  it("returns 'Ayer' for messages from yesterday", () => {
    const yesterday = new Date("2026-08-25T20:15:00");
    expect(formatConversationLastMessageDate(yesterday, referenceDate)).toBe("Ayer");

    const yesterdayEarly = new Date("2026-08-25T01:00:00");
    expect(formatConversationLastMessageDate(yesterdayEarly, referenceDate)).toBe("Ayer");
  });

  it("returns the day of the week in Spanish for messages between 2 and 6 days ago", () => {
    // 2 days ago: Monday, Aug 24
    const twoDaysAgo = new Date("2026-08-24T10:00:00");
    expect(formatConversationLastMessageDate(twoDaysAgo, referenceDate)).toBe("Lunes");

    // 3 days ago: Sunday, Aug 23
    const threeDaysAgo = new Date("2026-08-23T11:00:00");
    expect(formatConversationLastMessageDate(threeDaysAgo, referenceDate)).toBe("Domingo");

    // 4 days ago: Saturday, Aug 22
    const fourDaysAgo = new Date("2026-08-22T12:00:00");
    expect(formatConversationLastMessageDate(fourDaysAgo, referenceDate)).toBe("Sábado");

    // 5 days ago: Friday, Aug 21
    const fiveDaysAgo = new Date("2026-08-21T13:00:00");
    expect(formatConversationLastMessageDate(fiveDaysAgo, referenceDate)).toBe("Viernes");

    // 6 days ago: Thursday, Aug 20
    const sixDaysAgo = new Date("2026-08-20T14:00:00");
    expect(formatConversationLastMessageDate(sixDaysAgo, referenceDate)).toBe("Jueves");
  });

  it("returns full date with year dd/MM/yyyy for messages 7 or more days ago", () => {
    // Exactly 7 days ago: Wednesday, Aug 19
    const sevenDaysAgo = new Date("2026-08-19T15:30:00");
    expect(formatConversationLastMessageDate(sevenDaysAgo, referenceDate)).toBe("19/08/2026");

    // 10 days ago: Aug 16, 2026
    const tenDaysAgo = new Date("2026-08-16T10:00:00");
    expect(formatConversationLastMessageDate(tenDaysAgo, referenceDate)).toBe("16/08/2026");

    // Previous year: Aug 26, 2025
    const lastYear = new Date("2025-08-26T15:30:00");
    expect(formatConversationLastMessageDate(lastYear, referenceDate)).toBe("26/08/2025");
  });
});
