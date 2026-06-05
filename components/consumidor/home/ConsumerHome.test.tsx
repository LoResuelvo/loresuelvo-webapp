import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConsumerHome from "@/components/consumidor/home/ConsumerHome";

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
            { id: 2, name: "Electricista" }
        ];
        render(<ConsumerHome session={mockSession} categories={mockCategories} />);
        expect(screen.getByText("Plomería")).toBeInTheDocument();
        expect(screen.getByText("Electricista")).toBeInTheDocument();
    });
});