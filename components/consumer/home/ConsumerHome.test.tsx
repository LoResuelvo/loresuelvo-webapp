import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";

const mockUser = {
  id: "1",
  email: "andres@pro.com",
  firstName: "Andres",
  lastName: "Colina",
};

const mockSession = {
  user: mockUser,
};

describe('ConsumerHome', () => {
    it("renders the 'LoResuelvo' brand title in sidebar", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        expect(screen.getByText("LoResuelvo")).toBeInTheDocument();
    });

    it("renders the user's initials on the avatar button", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("opens the dropdown menu and displays user details and logout option on click", () => {
        render(<ConsumerHome session={mockSession} categories={[]} />);
        
        expect(screen.queryByText("Andres Colina")).not.toBeInTheDocument();

        const avatarButton = screen.getByRole("button", { name: "A" });
        fireEvent.click(avatarButton);

        expect(screen.getByText("Andres Colina")).toBeInTheDocument();
        expect(screen.getByText("andres@pro.com")).toBeInTheDocument();
        expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
    });

    it("renders the categories list", () => {
        const mockCategories = [
            { id: 1, name: "Plomería" },
            { id: 2, name: "Electricidad" }
        ];
        render(<ConsumerHome session={mockSession} categories={mockCategories} />);
        expect(screen.getByText("Plomería")).toBeInTheDocument();
        expect(screen.getByText("Electricidad")).toBeInTheDocument();
    });

    it("renders pending proposals when provided", () => {
        const mockPending = [
            {
                id: 1,
                conversationId: 2,
                amountCents: 1500000,
                scheduledOn: "2026-07-05T09:30:00-03:00",
                description: "Reparación",
                status: "pending" as const,
                createdOn: "2026-07-04T10:00:00-03:00",
                counterpart: { id: 1, role: "provider" as const, name: "Juan", surname: "Gómez", categoryName: "Plomería" }
            }
        ];
        render(<ConsumerHome session={mockSession} pendingProposals={mockPending} />);
        expect(screen.getByText("Propuestas Pendientes")).toBeInTheDocument();
        expect(screen.getByText("Juan Gómez")).toBeInTheDocument();
    });

    it("renders accepted proposals when provided", () => {
        const mockAccepted = [
            {
                id: 2,
                conversationId: 3,
                amountCents: 1000000,
                scheduledOn: "2026-08-05T09:30:00-03:00",
                description: "Pintura",
                status: "accepted" as const,
                createdOn: "2026-07-04T10:00:00-03:00",
                counterpart: { id: 2, role: "provider" as const, name: "Ana", surname: "Pérez", categoryName: "Pintor" }
            }
        ];
        render(<ConsumerHome session={mockSession} acceptedProposals={mockAccepted} />);
        expect(screen.getByText("Servicios Próximos")).toBeInTheDocument();
        expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    });
});