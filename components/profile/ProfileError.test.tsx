import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProfileError from "./ProfileError";

describe("ProfileError", () => {
  it("renders a safe error message and retries the profile query", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<ProfileError reset={reset} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la configuración");
    expect(alert).toHaveTextContent("No pudimos consultar tu perfil en este momento");
    expect(alert).not.toHaveTextContent("Internal Server Error");

    await user.click(screen.getByRole("button", { name: "Reintentar consulta" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
