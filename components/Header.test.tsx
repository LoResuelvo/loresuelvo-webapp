import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Header from "@/components/Header";

describe("Header", () => {
    it("renders the 'LoResuelvo' logo/title", () => {
        render(<Header />);
        expect(screen.getByRole("heading", { name: "LoResuelvo", level: 1 })).toBeInTheDocument();
    });

    it("renders the 'Iniciar Sesión' link", () => {
        render(<Header />);
        expect(screen.getByRole("link", { name: "Iniciar Sesión" })).toBeInTheDocument();
    });
});
