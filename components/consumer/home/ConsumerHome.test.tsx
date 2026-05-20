import { render, screen } from "@testing-library/react";
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
    describe("header",()  => {
        it("renders the 'LoResuelvo' logo/title", () => {
            render(<ConsumerHome session={mockSession} />);
            expect(screen.getByRole("heading", { name: "LoResuelvo", level: 1 })).toBeInTheDocument();
        });
    }
)})