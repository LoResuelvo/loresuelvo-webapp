import { describe, expect, it } from "vitest";
import { getChatDaySeparatorInfo } from "@/lib/messaging/chat-day-separator-utils";

describe("getChatDaySeparatorInfo", () => {
  it("uses local calendar dates around midnight", () => {
    const referenceDate = new Date(2026, 9, 13, 0, 10);
    const messageBeforeMidnight = new Date(2026, 9, 12, 23, 55).toISOString();

    expect(getChatDaySeparatorInfo(referenceDate.toISOString(), referenceDate)).toEqual({
      key: "2026-10-13",
      kind: "today",
      date: referenceDate,
    });
    expect(getChatDaySeparatorInfo(messageBeforeMidnight, referenceDate)).toEqual({
      key: "2026-10-12",
      kind: "yesterday",
      date: new Date(messageBeforeMidnight),
    });
  });

  it("uses weekday labels from two through six calendar days ago", () => {
    const referenceDate = new Date(2026, 9, 13, 12);

    expect(getChatDaySeparatorInfo(new Date(2026, 9, 11, 12).toISOString(), referenceDate)).toMatchObject({
      key: "2026-10-11",
      kind: "weekday",
      weekdayIndex: 0,
    });
    expect(getChatDaySeparatorInfo(new Date(2026, 9, 7, 12).toISOString(), referenceDate)).toMatchObject({
      key: "2026-10-07",
      kind: "weekday",
      weekdayIndex: 3,
    });
  });

  it("keeps full dates across year boundaries at seven days or more", () => {
    const referenceDate = new Date(2027, 0, 2, 12);
    const oldMessage = new Date(2026, 11, 26, 12).toISOString();

    expect(getChatDaySeparatorInfo(oldMessage, referenceDate)).toMatchObject({
      key: "2026-12-26",
      kind: "date",
    });
  });

  it("does not invent calendar days for missing or invalid timestamps", () => {
    const referenceDate = new Date(2026, 9, 13, 12);

    expect(getChatDaySeparatorInfo(undefined, referenceDate)).toBeNull();
    expect(getChatDaySeparatorInfo("10:30", referenceDate)).toBeNull();
  });
});
