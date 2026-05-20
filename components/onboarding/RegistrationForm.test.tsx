import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { AuthSession } from "@/lib/auth/types";

const mockSession: AuthSession = {
  user: {
    id: "1",
    email: "test@example.com",
    firstName: "Maria",
    lastName: "Gomez",
  },
};

describe("RegistrationForm", () => {
  it("renders empty inputs when no session is provided", () => {
    render(<RegistrationForm session={null} />);
    
    const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
    
    expect(firstNameInput).toBeInTheDocument();
    expect(lastNameInput).toBeInTheDocument();
    
    expect(firstNameInput.value).toBe("");
    expect(lastNameInput.value).toBe("");
  });

  it("renders the submit button", () => {
    render(<RegistrationForm session={null} />);
    
    const submitButton = screen.getByRole("button", { name: /Continuar/i });
    expect(submitButton).toBeInTheDocument();
  });
});
