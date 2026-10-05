import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkOrderCalendarLoading from "./WorkOrderCalendarLoading";

describe("WorkOrderCalendarLoading", () => {
  it("announces the pending account lookup without suggesting a connection status", () => {
    render(<WorkOrderCalendarLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Consultando el estado de tu cuenta de Google Calendar…");
    expect(screen.queryByText("Google Calendar vinculado")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
