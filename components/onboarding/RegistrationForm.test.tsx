import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { submitRegistration } from "@/app/onboarding/registrationButtonAction";

// Mock of the Server Action to avoid Auth0 alerts and verify submission in isolation
vi.mock("@/app/onboarding/registrationButtonAction", () => ({
  submitRegistration: vi.fn(),
}));

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("step 1", () => {
    it("renders 'Soy Cliente' and 'Soy Técnico' cards on step 1", () => {
      render(<RegistrationForm session={null} />);
      expect(screen.getByText("Soy Cliente")).toBeInTheDocument();
      expect(screen.getByText("Soy Técnico")).toBeInTheDocument();
    });

    it("keeps the 'Continuar' button disabled by default", () => {
      render(<RegistrationForm session={null} />);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      expect(continueButton).toBeDisabled();
    });

    it("enables the 'Continuar' button after a role is selected", () => {
      render(<RegistrationForm session={null} />);
      const clientButton = screen.getByText("Soy Cliente").closest("button");
      fireEvent.click(clientButton!);

      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      expect(continueButton).toBeEnabled();
    });
  });

  describe("step 2", () => {
    it("renders empty 'Nombre' and 'Apellido' inputs after advancing to step 2", () => {
      render(<RegistrationForm session={null} />);
    
      const clientButton = screen.getByText("Soy Cliente").closest("button");
      fireEvent.click(clientButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      
      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
      expect(firstNameInput.value).toBe("");
      expect(lastNameInput.value).toBe("");
    });
  })



  // ==========================================
  // SUMISIÓN Y CASOS DE ÉXITO (HAPPY PATH)
  // ==========================================

  describe("two steps", () => {
    it("submits the correct consumer role and inputs to the backend registration", async () => {
      const mockSubmit = vi.mocked(submitRegistration).mockResolvedValue(undefined as never);
      render(<RegistrationForm session={null} />);
      
      // Step 1: select consumer role and continue
      const clientButton = screen.getByText("Soy Cliente").closest("button");
      fireEvent.click(clientButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      // Step 2: fill valid inputs and submit
      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      fireEvent.change(firstNameInput, { target: { value: "Maria" } });
      fireEvent.change(lastNameInput, { target: { value: "Gomez" } });
      
      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });

      const [submittedFormData] = mockSubmit.mock.lastCall as [FormData];
      expect(submittedFormData.get("firstName")).toBe("Maria");
      expect(submittedFormData.get("lastName")).toBe("Gomez");
      expect(submittedFormData.get("role")).toBe("consumer");
    });

    it("submits the correct provider role and inputs to the backend registration", async () => {
      const mockSubmit = vi.mocked(submitRegistration).mockResolvedValue(undefined as never);
      render(<RegistrationForm session={null} />);
      
      // Step 1: select technical role and continue
      const techButton = screen.getByText("Soy Técnico").closest("button");
      fireEvent.click(techButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      // Step 2: fill valid inputs and submit
      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      fireEvent.change(firstNameInput, { target: { value: "Andres" } });
      fireEvent.change(lastNameInput, { target: { value: "Colina" } });
      
      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });

      const [submittedFormData] = mockSubmit.mock.lastCall as [FormData];
      expect(submittedFormData.get("firstName")).toBe("Andres");
      expect(submittedFormData.get("lastName")).toBe("Colina");
      expect(submittedFormData.get("role")).toBe("provider");
    });
  })
});
