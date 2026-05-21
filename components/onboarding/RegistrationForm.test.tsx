import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { AuthSession } from "@/lib/auth/types";

const mockSession: AuthSession = {
  user: {
    id: "1",
    email: "test@example.com",
    firstName: "Maria",
    lastName: "Gomez",
    isOnboarded: false
  },
};

describe("RegistrationForm", () => {
  it("renders role selection options on step 1", () => {
    render(<RegistrationForm session={null} />);
    
    expect(screen.getByText("Soy Cliente")).toBeInTheDocument();
    expect(screen.getByText("Soy Técnico")).toBeInTheDocument();
    
    const continueButton = screen.getByRole("button", { name: /Continuar/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toBeDisabled();
  });

  it("advances to step 2 after selecting role and clicking continue", () => {
    render(<RegistrationForm session={null} />);
    
    // Step 1
    const clientButton = screen.getByText("Soy Cliente").closest("button");
    expect(clientButton).toBeInTheDocument();
    fireEvent.click(clientButton!);
    
    const continueButton = screen.getByRole("button", { name: /Continuar/i });
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    
    // Step 2
    const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
    
    expect(firstNameInput).toBeInTheDocument();
    expect(lastNameInput).toBeInTheDocument();
    expect(firstNameInput.value).toBe("");
    expect(lastNameInput.value).toBe("");
  });
});
