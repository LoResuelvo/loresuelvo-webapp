import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderCard from "@/components/consumer/search/ProviderCard";

describe('ProviderCard', () => {
    it("displays the provider's profile photo when profilePhotoUrl is present", () => {
        const mockProvider = { 
            id: 1, 
            name: "Juan", 
            surname: "Pérez", 
            categoryName: "Plomería",
            profilePhotoUrl: "https://example.com/profile.jpg"
        };

        render(<ProviderCard provider={mockProvider} />);
        
        const image = screen.getByTestId("provider-profile-photo");
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute("src", "https://example.com/profile.jpg");
    });

    it("does not display an image and shows default icon when profilePhotoUrl is missing", () => {
        const mockProvider = { 
            id: 1, 
            name: "Ana", 
            surname: "Gómez", 
            categoryName: "Electricidad",
        };

        const { container } = render(<ProviderCard provider={mockProvider} />);
        
        expect(screen.queryByTestId("provider-profile-photo")).not.toBeInTheDocument();
        const svgElement = container.querySelector('svg.lucide-user');
        expect(svgElement).toBeInTheDocument();
    });

    it("displays the provider's name, surname, description, rating, and review count correctly", () => {
        const mockProvider = { 
            id: 1, 
            name: "Pedro", 
            surname: "González", 
            categoryName: "Plomería",
            description: "Plomero experto con 20 años de experiencia.",
            rating: 4.8,
            reviews: 150,
            jobs: 200,
        };

        render(<ProviderCard provider={mockProvider} />);
        
        expect(screen.getByText("Pedro González")).toBeInTheDocument();
        expect(screen.getByText("Plomero experto con 20 años de experiencia.")).toBeInTheDocument();
        expect(screen.getByText("4.8")).toBeInTheDocument();
        expect(screen.getByText("(150 reseñas)")).toBeInTheDocument();
        expect(screen.queryByText(/trabajos/i)).not.toBeInTheDocument();
    });

    it("displays 'Sin reseñas aún' and no review count when the provider has no reviews", () => {
        const mockProvider = {
            id: 1,
            name: "Juan",
            surname: "Pérez",
            categoryName: "Plomería",
            rating: 0,
            reviews: 0,
        };

        render(<ProviderCard provider={mockProvider} />);

        expect(screen.getByText("Sin reseñas aún")).toBeInTheDocument();
        expect(screen.queryByText(/0 reseñas/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/trabajos/i)).not.toBeInTheDocument();
    });

    it("displays singular 'reseña' when review count is 1", () => {
        const mockProvider = {
            id: 1,
            name: "Matex",
            surname: "Test",
            categoryName: "Plomería",
            rating: 4.0,
            reviews: 1,
        };

        render(<ProviderCard provider={mockProvider} />);

        expect(screen.getByText("(1 reseña)")).toBeInTheDocument();
        expect(screen.queryByText("Sin reseñas aún")).not.toBeInTheDocument();
    });

    it("renders rating stars as decorative content", () => {
        const mockProvider = {
            id: 1,
            name: "Juan",
            surname: "Pérez",
            categoryName: "Plomería",
            rating: 4.5,
            reviews: 2,
        };

        const { container } = render(<ProviderCard provider={mockProvider} />);

        expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    });

    it("calls onContact with the provider when 'Contactar' button is clicked", async () => {
        const userEvent = (await import("@testing-library/user-event")).default;
        const mockOnContact = vi.fn();
        const mockProvider = { 
            id: 1, 
            name: "Laura", 
            surname: "Martínez", 
            categoryName: "Pintura",
        };

        render(<ProviderCard provider={mockProvider} onContact={mockOnContact} />);
        
        const contactButton = screen.getByRole("button", { name: /contactar/i });
        await userEvent.setup().click(contactButton);
        
        expect(mockOnContact).toHaveBeenCalledTimes(1);
        expect(mockOnContact).toHaveBeenCalledWith(mockProvider);
    });

    it("renders an accessible link to the provider profile", () => {
        const mockProvider = {
            id: 7,
            name: "Juan",
            surname: "Gómez",
            categoryName: "Plomería",
        };

        render(<ProviderCard provider={mockProvider} />);

        expect(screen.getByRole("link", { name: /ver perfil/i })).toHaveAttribute(
            "href",
            "/consumidor/prestadores/7",
        );
    });
});
