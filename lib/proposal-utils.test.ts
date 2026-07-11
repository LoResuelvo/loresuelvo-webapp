import { expect, test } from "vitest";
import { formatAmountCents, formatScheduledOn, getStatusBadge } from "./proposal-utils";

test("formatAmountCents correctly formats cents to currency", () => {
  expect(formatAmountCents(1500050)).toBe("$ 15.000,50");
  expect(formatAmountCents(1000)).toBe("$ 10,00");
});

test("formatScheduledOn correctly formats ISO date to date and time", () => {
  const isoDate = "2026-07-05T09:30:00Z";
  const result = formatScheduledOn(isoDate);
  expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2} hs/);
});

test("getStatusBadge returns correct label and variant", () => {
  expect(getStatusBadge("pending")).toEqual({ label: "Pendiente", variant: "warning" });
  expect(getStatusBadge("accepted")).toEqual({ label: "Aceptada", variant: "success" });
  expect(getStatusBadge("rejected")).toEqual({ label: "Rechazada", variant: "destructive" });
  expect(getStatusBadge("unknown")).toEqual({ label: "unknown", variant: "default" });
});
