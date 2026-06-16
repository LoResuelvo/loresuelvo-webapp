import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderCard from "@/components/consumidor/search/ProviderCard";

describe('ProviderCard', () => {
    it("displays the provider's profile photo when profile_photo_url is present", () => {
        const mockProvider = { 
            id: 1, 
            name: "Juan", 
            surname: "Pérez", 
            category_name: "Plomería",
            profile_photo_url: "https://example.com/profile.jpg"
        };

        render(<ProviderCard provider={mockProvider} />);
        
        const image = screen.getByTestId("provider-profile-photo");
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute("src", "https://example.com/profile.jpg");
    });

    it("does not display an image and shows default icon when profile_photo_url is missing", () => {
        const mockProvider = { 
            id: 1, 
            name: "Ana", 
            surname: "Gómez", 
            category_name: "Electricidad",
        };

        const { container } = render(<ProviderCard provider={mockProvider} />);
        
        expect(screen.queryByTestId("provider-profile-photo")).not.toBeInTheDocument();
        const svgElement = container.querySelector('svg.lucide-user');
        expect(svgElement).toBeInTheDocument();
    });

    it("displays the provider's name, surname, description, rating, and jobs correctly", () => {
        const mockProvider = { 
            id: 1, 
            name: "Pedro", 
            surname: "González", 
            category_name: "Plomería",
            description: "Plomero experto con 20 años de experiencia.",
            rating: 4.8,
            reviews: 150,
            jobs: 200
        };

        render(<ProviderCard provider={mockProvider} />);
        
        expect(screen.getByText("Pedro González")).toBeInTheDocument();
        expect(screen.getByText("Plomero experto con 20 años de experiencia.")).toBeInTheDocument();
        expect(screen.getByText("4.8")).toBeInTheDocument();
        expect(screen.getByText("(150 reseñas) | 200 trabajos")).toBeInTheDocument();
    });

    it("calls onContact with the provider when 'Contactar' button is clicked", async () => {
        const userEvent = (await import("@testing-library/user-event")).default;
        const mockOnContact = vi.fn();
        const mockProvider = { 
            id: 1, 
            name: "Laura", 
            surname: "Martínez", 
            category_name: "Pintura",
        };

        render(<ProviderCard provider={mockProvider} onContact={mockOnContact} />);
        
        const contactButton = screen.getByRole("button", { name: /contactar/i });
        await userEvent.setup().click(contactButton);
        
        expect(mockOnContact).toHaveBeenCalledTimes(1);
        expect(mockOnContact).toHaveBeenCalledWith(mockProvider);
    });
});
