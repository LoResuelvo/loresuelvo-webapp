import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WorkOrderCalendarReauthorization from "./WorkOrderCalendarReauthorization";

describe("WorkOrderCalendarReauthorization", () => {
  it("communicates pending authorization and prevents another activation", async () => {
    const onReauthorize = vi.fn();
    render(<WorkOrderCalendarReauthorization onReauthorize={onReauthorize} isAuthorizing />);

    const action = screen.getByRole("button", { name: "Conectando con Google Calendar…" });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("aria-busy", "true");
    await userEvent.setup().click(action);
    expect(onReauthorize).not.toHaveBeenCalled();
  });

  it("announces account attention and delegates the keyboard action", async () => {
    const onReauthorize = vi.fn();
    render(<WorkOrderCalendarReauthorization onReauthorize={onReauthorize} />);

    expect(screen.getByRole("status")).toHaveTextContent("Google Calendar requiere autorización");
    const action = screen.getByRole("button", { name: "Reautorizar Google Calendar" });
    const user = userEvent.setup();
    await user.tab();
    expect(action).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onReauthorize).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/sincronizad[ao]/i)).not.toBeInTheDocument();
  });
});
