/**
 * Los tests de HomePage se dividen por componente porque PageLayout es un async
 * Server Component que llama a getAuthService() en servidor.
 * React Testing Library no puede await Server Components asincrónicos.
 * Cada componente hijo se testea de forma independiente.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Header from "@/components/Header";
import HeroContent from "@/components/HeroContent";
import RegistrationCard from "@/components/RegistrationCard";
import Footer from "@/components/Footer";
import { ROUTES } from "@/lib/routes";

describe("HomePage", () => {
    it("renders the main title from Header", () => {
        render(<Header />);
        expect(screen.getByRole("heading", { name: "LoResuelvo", level: 1 })).toBeInTheDocument();
    });

    it("renders the main heading and subtitle", () => {
        render(<HeroContent />);
        expect(screen.getByText("Profesionales verificados")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Soluciones profesionales.*para tu hogar/i, level: 2 })).toBeInTheDocument();
        expect(screen.getByText(/Conecta al instante con expertos certificados/i)).toBeInTheDocument();
    });

    it("renders the footer text", () => {
        render(<Footer />);
        expect(screen.getByText(/LoResuelvo ©2026 Todos los derechos reservados/i)).toBeInTheDocument();
    });
});

describe("HomePage - RegistrationCard", () => {
    it("renders the 'Registrarme como Cliente' card", () => {
        render(
            <RegistrationCard
                title="Registrarme como Cliente"
                description="Necesito ayuda profesional en mi hogar."
                buttonText="Ser Cliente"
                buttonClass="bg-brand-primary text-white"
                href={ROUTES.auth.signup}
            />
        );
        expect(screen.getByRole("heading", { name: "Registrarme como Cliente", level: 3 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Ser Cliente/i })).toBeInTheDocument();
    });

    it("renders the 'Registrarme como Técnico' card", () => {
        render(
            <RegistrationCard
                title="Registrarme como Técnico"
                description="Quiero ofrecer mis servicios y crecer mi negocio."
                buttonText="Ser Técnico"
                buttonClass="border text-brand-primary"
                href={ROUTES.auth.signup}
            />
        );
        expect(screen.getByRole("heading", { name: "Registrarme como Técnico", level: 3 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Ser Técnico/i })).toBeInTheDocument();
    });
});