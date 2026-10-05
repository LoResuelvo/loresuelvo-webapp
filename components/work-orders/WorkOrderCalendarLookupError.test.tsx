import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkOrderCalendarLookupError from "./WorkOrderCalendarLookupError";

describe("WorkOrderCalendarLookupError", () => {
  it("announces a safe account lookup error without suggesting a connection status", () => {
    render(<WorkOrderCalendarLookupError />);

    expect(screen.getByRole("status")).toHaveTextContent("No pudimos consultar el estado de tu cuenta de Google Calendar. Intentá nuevamente.");
    expect(screen.queryByText("Google Calendar vinculado")).not.toBeInTheDocument();
    expect(screen.queryByText("Google Calendar requiere autorización")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
