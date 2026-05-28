import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SearchClient from "@/components/consumer/search/SearchClient";
import { Category, Provider } from "@/lib/api/types";

const mockUser = {
  id: "1",
  email: "andres@pro.com",
  firstName: "Andres",
  lastName: "Colina",
};

const mockSession = {
  user: mockUser,
};

const mockCategories: Category[] = [
  { id: 1, name: "Plomería" },
  { id: 2, name: "Electricista" }
];

const mockProviders: Provider[] = [
  { 
    id: 1, 
    name: "Carlos", 
    surname: "Mendoza", 
    category_name: "Plomería",
    description: "Especialista en fugas y tuberías de alta presión."
  },
  { id: 2, name: "Elena", surname: "Rodríguez", category_name: "Plomería" }
];

describe('SearchClient', () => {
    it("renders the sidebar and dynamic category title", () => {
        render(
            <SearchClient 
                session={mockSession} 
                providers={mockProviders} 
                selectedCategory={mockCategories[0]} 
            />
        );
        expect(screen.getByText("LoResuelvo")).toBeInTheDocument();
        expect(screen.getByText("CATEGORÍA: Plomería")).toBeInTheDocument();
        expect(screen.getByText("Prestadores")).toBeInTheDocument();
    });

    it("renders the providers list successfully", () => {
        render(
            <SearchClient 
                session={mockSession} 
                providers={mockProviders} 
                selectedCategory={mockCategories[0]} 
            />
        );
        expect(screen.getByText("Carlos Mendoza")).toBeInTheDocument();
        expect(screen.getByText("Elena Rodríguez")).toBeInTheDocument();
        expect(screen.getByText("Especialista en fugas y tuberías de alta presión.")).toBeInTheDocument();
    });

    it("renders the empty state message when no providers exist", () => {
        render(
            <SearchClient 
                session={mockSession} 
                providers={[]} 
                selectedCategory={mockCategories[0]} 
            />
        );
        expect(screen.getByText("No se encontraron profesionales especializados en esta categoría", { exact: false })).toBeInTheDocument();
    });
});
