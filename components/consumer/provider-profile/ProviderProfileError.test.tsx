import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderProfileError from "./ProviderProfileError";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/consumidor/prestadores/1"),
}));

describe("ProviderProfileError", () => {
  it("renders safe error message and triggers retry when clicked", () => {
    const handleReset = vi.fn();
    render(<ProviderProfileError reset={handleReset} />);

    expect(
      screen.getByRole("heading", { name: /no pudimos cargar el perfil/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ocurrió una falla temporal al consultar el perfil/i),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /reintentar/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(handleReset).toHaveBeenCalledOnce();
  });
});
