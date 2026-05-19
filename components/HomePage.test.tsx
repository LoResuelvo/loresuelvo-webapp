import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/components/HomePage";

describe("HomePage", () => {
    it("renders the main title from Header", () => {
        render(<HomePage />);
        expect(screen.getByRole("heading", { name: "LoResuelvo", level: 1 })).toBeInTheDocument();
    });

    it("renders the main heading and subtitle", () => {
        render(<HomePage />);
        expect(screen.getByText("Profesionales verificados")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Soluciones profesionales.*para tu hogar/i, level: 2 })).toBeInTheDocument();
        expect(screen.getByText(/Conecta al instante con expertos certificados/i)).toBeInTheDocument();
    });

    it("renders the 'Registrarme como Cliente' card", () => {
        render(<HomePage />);
        expect(screen.getByRole("heading", { name: "Registrarme como Cliente", level: 3 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Ser Cliente/i })).toBeInTheDocument();
    });

    it("renders the 'Registrarme como Técnico' card", () => {
        render(<HomePage />);
        expect(screen.getByRole("heading", { name: "Registrarme como Técnico", level: 3 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Ser Técnico/i })).toBeInTheDocument();
    });

    it("renders the footer", () => {
        render(<HomePage />);
        expect(screen.getByText(/LoResuelvo ©2026 Todos los derechos reservados/i)).toBeInTheDocument();
    });
});