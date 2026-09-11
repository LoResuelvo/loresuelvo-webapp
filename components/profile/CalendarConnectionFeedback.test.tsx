import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CalendarConnectionFeedback from "./CalendarConnectionFeedback";

describe("CalendarConnectionFeedback", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/consumidor/mi-perfil?calendar_result=success");
  });

  it("announces a confirmed success when the authoritative profile is connected", async () => {
    render(<CalendarConnectionFeedback result="success" status="connected" />);

    expect(screen.getByRole("status")).toHaveTextContent("Google Calendar fue vinculado");
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("does not claim success when the profile is not connected", async () => {
    render(<CalendarConnectionFeedback result="success" status="disconnected" />);

    const feedback = screen.getByRole("status");
    expect(feedback).toHaveTextContent("No pudimos confirmar la vinculación de Google Calendar");
    expect(feedback).not.toHaveTextContent("fue vinculado correctamente");
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("announces cancellation without changing the authoritative disconnected state", async () => {
    render(<CalendarConnectionFeedback result="cancelled" status="disconnected" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "La vinculación de Google Calendar fue cancelada",
    );
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("renders no feedback when there is no valid callback result", () => {
    render(<CalendarConnectionFeedback result={null} status="connected" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
