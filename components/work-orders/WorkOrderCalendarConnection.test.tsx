import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import WorkOrderCalendarConnection from "./WorkOrderCalendarConnection";

describe("WorkOrderCalendarConnection", () => {
  it("invites a disconnected account to its supplied profile destination", async () => {
    render(<WorkOrderCalendarConnection connection={{ state: "ready", status: "disconnected" }} profileHref="/perfil-de-prueba" />);

    expect(screen.getByRole("status")).toHaveTextContent("Vinculá Google Calendar desde Mi perfil.");
    const link = screen.getByRole("link", { name: "Mi perfil" });
    expect(link).toHaveAttribute("href", "/perfil-de-prueba");
    await userEvent.setup().tab();
    expect(link).toHaveFocus();
    expect(screen.queryByText("Google Calendar vinculado")).not.toBeInTheDocument();
  });

  it("identifies a connected account without confirming appointment synchronization", () => {
    render(<WorkOrderCalendarConnection connection={{ state: "ready", status: "connected" }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Google Calendar vinculado");
    expect(screen.queryByText(/sincronizad[ao]/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([undefined, "disconnected"] as const)(
    "does not claim an account is connected for %s",
    (status) => {
      render(<WorkOrderCalendarConnection connection={status ? { state: "ready", status } : undefined} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );
});
