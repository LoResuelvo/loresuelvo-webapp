import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "@/components/consumer/Sidebar";

const mockUsePathname = vi.fn(() => "/consumidor/home");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("Sidebar", () => {
  it("navega al chat con IA desde la opción del consumidor", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /chat con ia/i })).toHaveAttribute(
      "href",
      "/consumidor/mensajes-ia",
    );
  });
});
