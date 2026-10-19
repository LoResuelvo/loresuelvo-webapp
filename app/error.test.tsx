import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "./error";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("root error boundary", () => {
  beforeEach(() => {
    refresh.mockClear();
  });

  it("keeps the error private and refreshes server data when retried by keyboard", async () => {
    const user = userEvent.setup();
    const reset = vi.fn(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    render(
      <ErrorBoundary
        error={new Error("private upstream details")}
        reset={reset}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No pudimos cargar esta página" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("private upstream details")).not.toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Intentar de nuevo" });
    await user.tab();
    expect(retryButton).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
