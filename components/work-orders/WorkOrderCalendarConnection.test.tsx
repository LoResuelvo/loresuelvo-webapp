import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkOrderCalendarConnection from "./WorkOrderCalendarConnection";

describe("WorkOrderCalendarConnection", () => {
  it("identifies a connected account without confirming appointment synchronization", () => {
    render(<WorkOrderCalendarConnection status="connected" />);

    expect(screen.getByRole("status")).toHaveTextContent("Google Calendar vinculado");
    expect(screen.queryByText(/sincronizad[ao]/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([undefined, "disconnected", "action_required"] as const)(
    "does not claim an account is connected for %s",
    (status) => {
      render(<WorkOrderCalendarConnection status={status} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );
});
