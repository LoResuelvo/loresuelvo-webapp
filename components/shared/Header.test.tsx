import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Header from "@/components/shared/Header";

const mockUser = {
  id: "1",
  email: "andres@pro.com",
  firstName: "Andres",
  lastName: "Colina",
};

describe("Header", () => {
    describe("user unauthenticated", () => {
        it("renders the 'LoResuelvo' logo/title", () => {
            render(<Header />);
            expect(screen.getByRole("heading", { name: "LoResuelvo", level: 1 })).toBeInTheDocument();
        });

        it("renders the 'Iniciar Sesión' link", () => {
            render(<Header />);
            expect(screen.getByRole("link", { name: "Iniciar Sesión" })).toBeInTheDocument();
        });

        it("renders the 'Registrarse' link", () => {
            render(<Header />)
            expect(screen.getByRole("link", { name: "Registrarse" })).toBeInTheDocument();
        })
    });

    describe("user authenticated", () => {
        it("renders the user's first name", () => {
            render(<Header user={mockUser} />);
            expect(screen.getByText(/Hola, Andres/i)).toBeInTheDocument();
        });

        it("renders the 'Cerrar sesión' link", () => {
            render(<Header user={mockUser} />);
            expect(screen.getByRole("link", { name: "Cerrar sesión" })).toBeInTheDocument();
        });

        it("does not render 'Iniciar Sesión' link", () => {
            render(<Header user={mockUser} />);
            expect(screen.queryByRole("link", { name: "Iniciar Sesión" })).not.toBeInTheDocument();
        });

        it("does not render 'Registrarse' link", () => {
            render(<Header user={mockUser} />);
            expect(screen.queryByRole("link", { name: "Registrarse" })).not.toBeInTheDocument();
        })
    });
});
