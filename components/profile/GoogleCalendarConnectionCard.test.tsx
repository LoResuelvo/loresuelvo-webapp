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

  it("renders the authorization alert and reauthorization action", () => {
    render(<GoogleCalendarConnectionCard status="action_required" />);

    expect(screen.getByRole("status")).toHaveTextContent("Google Calendar requiere autorización");
    expect(
      screen.getByRole("button", { name: "Reautorizar Google Calendar" }),
    ).toBeInTheDocument();
  });

  it("renders the connection action as busy and disabled while authorizing", () => {
    render(
      <GoogleCalendarConnectionCard
        status="disconnected"
        isAuthorizing
        onAuthorize={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Conectando con Google Calendar…" }),
    ).toBeDisabled();
  });

  it("renders a safe authorization error without exposing internal details", () => {
    render(
      <GoogleCalendarConnectionCard
        status="disconnected"
        authorizationError="No pudimos iniciar la vinculación con Google Calendar. Intentá nuevamente."
        onAuthorize={() => undefined}
      />,
    );

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("No pudimos iniciar la vinculación con Google Calendar");
    expect(error).not.toHaveTextContent("Internal Server Error");
  });
});
