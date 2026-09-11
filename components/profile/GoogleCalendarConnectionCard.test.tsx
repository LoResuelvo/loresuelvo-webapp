import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GoogleCalendarConnectionCard from "./GoogleCalendarConnectionCard";

describe("GoogleCalendarConnectionCard", () => {
  it("renders the disconnected state and its connection action", () => {
    render(<GoogleCalendarConnectionCard status="disconnected" />);

    expect(screen.getByRole("heading", { name: "Google Calendar" })).toBeInTheDocument();
    expect(screen.getByText("No vinculada", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Vincular Google Calendar" }),
    ).toBeInTheDocument();
  });

  it("renders the connected state without a reconnection action", () => {
    render(<GoogleCalendarConnectionCard status="connected" />);

    expect(screen.getByText("Vinculada y sincronizada", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
