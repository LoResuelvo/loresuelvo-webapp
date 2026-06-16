import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Header from "@/components/shared/Header";
import HeroContent from "@/components/shared/HeroContent";
import RoleSelectionCard from "@/components/shared/RoleSelectionCard";
import { FeatureCard } from "@/components/shared/FeatureCard";
import Footer from "@/components/shared/Footer";
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

describe("HomePage - RoleSelectionCard", () => {
    it("renders the unified client and technician role columns with custom content", () => {
        render(
            <RoleSelectionCard
                clienteDesc="Busco ayuda profesional en mi hogar."
                clienteBtn="Encontrar un profesional"
                clienteHref={ROUTES.auth.signup}
                tecnicoDesc="Quiero ofrecer mis servicios especializados."
                tecnicoBtn="Unirme como profesional"
                tecnicoHref={ROUTES.auth.signup}
            />
        );
        expect(screen.getByText("Soy Cliente")).toBeInTheDocument();
        expect(screen.getByText("Soy Prestador")).toBeInTheDocument();
        expect(screen.getByText("Busco ayuda profesional en mi hogar.")).toBeInTheDocument();
        expect(screen.getByText("Quiero ofrecer mis servicios especializados.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Encontrar un profesional/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Unirme como profesional/i })).toBeInTheDocument();
    });
});

describe("HomePage - FeatureCard", () => {
    it("renders the feature title and description", () => {
        render(
            <FeatureCard
                title="Diagnóstico con IA"
                description="Sube una foto o describe el problema."
            />
        );
        expect(screen.getByRole("heading", { name: "Diagnóstico con IA", level: 4 })).toBeInTheDocument();
        expect(screen.getByText("Sube una foto o describe el problema.")).toBeInTheDocument();
    });
});