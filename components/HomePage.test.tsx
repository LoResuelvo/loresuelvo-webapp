import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/components/HomePage";

describe("HomePage", () => {
    it("renders the main title from Header", () => {
        render(<HomePage />);
        expect(screen.getByRole("heading", { name: "LoResuelvo", level: 1 })).toBeInTheDocument();
    });

    it("renders the footer", () => {
        render(<HomePage />);
        expect(screen.getByText(/LoResuelvo ©2026 Todos los derechos reservados/i)).toBeInTheDocument();
    });
});