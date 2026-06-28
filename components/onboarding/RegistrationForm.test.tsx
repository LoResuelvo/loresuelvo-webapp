import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RegistrationForm from "@/components/onboarding/RegistrationForm";
import { submitRegistration } from "@/app/onboarding/actions";


// Mock of the Server Action to avoid Auth0 alerts and verify submission in isolation
vi.mock("@/app/onboarding/actions", () => ({
  submitRegistration: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/app/files/actions", () => ({
  getPresignedUrlAction: vi.fn().mockResolvedValue({
    upload_url: "http://mock-upload.test/url",
    file_id: "mock-file-id",
    key: "mock-key",
    headers: {},
  }),
  confirmUploadAction: vi.fn().mockResolvedValue({
    id: "mock-file-id",
    url: "http://mock-cdn.test/url.jpg",
    original_name: "mock.png",
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/infrastructure/storage/storage-client", () => ({
  storageClient: {
    uploadFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
  });

  describe("step 1", () => {
    it("renders 'Soy Cliente' and 'Soy Prestador' cards on step 1", () => {
      render(<RegistrationForm session={null} />);
      expect(screen.getByText("Soy Cliente")).toBeInTheDocument();
      expect(screen.getByText("Soy Prestador")).toBeInTheDocument();
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




  describe("two steps", () => {
    it("submits the correct consumer role and inputs to the backend registration", async () => {
      const mockSubmit = vi.mocked(submitRegistration).mockResolvedValue(undefined as never);
      render(<RegistrationForm session={null} />);

      const clientButton = screen.getByText("Soy Cliente").closest("button");
      fireEvent.click(clientButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

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
      const mockCategories = [{ id: 4, name: "Plomería" }];
      render(<RegistrationForm session={null} categories={mockCategories} />);

      const techButton = screen.getByText("Soy Prestador").closest("button");
      fireEvent.click(techButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      const categorySelect = screen.getByLabelText(/Rubro/i) as HTMLSelectElement;

      fireEvent.change(firstNameInput, { target: { value: "Andres" } });
      fireEvent.change(lastNameInput, { target: { value: "Colina" } });
      fireEvent.change(categorySelect, { target: { value: "4" } });

      const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
      const originalGet = window.FormData.prototype.get;
      vi.spyOn(window.FormData.prototype, 'get').mockImplementation(function(this: FormData, key: string) {
        if (key === "profilePhoto") return file;
        return originalGet.call(this, key);
      });

      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
      });

      const [submittedFormData] = mockSubmit.mock.lastCall as [FormData];
      expect(submittedFormData.get("firstName")).toBe("Andres");
      expect(submittedFormData.get("lastName")).toBe("Colina");
      expect(submittedFormData.get("role")).toBe("provider");
      expect(submittedFormData.get("categoryId")).toBe("4");
      expect((submittedFormData.get("profilePhoto") as File).name).toBe("avatar.png");
    });

    it("shows validation error if provider does not select a category", async () => {
      const mockSubmit = vi.mocked(submitRegistration);
      const mockCategories = [{ id: 4, name: "Plomería" }];
      render(<RegistrationForm session={null} categories={mockCategories} />);

      const techButton = screen.getByText("Soy Prestador").closest("button");
      fireEvent.click(techButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;

      fireEvent.change(firstNameInput, { target: { value: "Andres" } });
      fireEvent.change(lastNameInput, { target: { value: "Colina" } });

      const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
      const originalGet = window.FormData.prototype.get;
      vi.spyOn(window.FormData.prototype, 'get').mockImplementation(function(this: FormData, key: string) {
        if (key === "profilePhoto") return file;
        return originalGet.call(this, key);
      });

      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText("Debe seleccionar un rubro")).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error if provider does not upload a profile photo", async () => {
      const mockSubmit = vi.mocked(submitRegistration);
      const mockCategories = [{ id: 4, name: "Plomería" }];
      render(<RegistrationForm session={null} categories={mockCategories} />);

      const techButton = screen.getByText("Soy Prestador").closest("button");
      fireEvent.click(techButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      const categorySelect = screen.getByLabelText(/Rubro/i) as HTMLSelectElement;

      fireEvent.change(firstNameInput, { target: { value: "Andres" } });
      fireEvent.change(lastNameInput, { target: { value: "Colina" } });
      fireEvent.change(categorySelect, { target: { value: "4" } });

      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText("La foto de perfil es obligatoria")).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error if provider uploads invalid photo format", async () => {
      const mockSubmit = vi.mocked(submitRegistration);
      const mockCategories = [{ id: 4, name: "Plomería" }];
      render(<RegistrationForm session={null} categories={mockCategories} />);

      const techButton = screen.getByText("Soy Prestador").closest("button");
      fireEvent.click(techButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      const categorySelect = screen.getByLabelText(/Rubro/i) as HTMLSelectElement;

      fireEvent.change(firstNameInput, { target: { value: "Andres" } });
      fireEvent.change(lastNameInput, { target: { value: "Colina" } });
      fireEvent.change(categorySelect, { target: { value: "4" } });

      const file = new File(["dummy content"], "doc.pdf", { type: "application/pdf" });
      const originalGet = window.FormData.prototype.get;
      vi.spyOn(window.FormData.prototype, 'get').mockImplementation(function(this: FormData, key: string) {
        if (key === "profilePhoto") return file;
        return originalGet.call(this, key);
      });

      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText("Formato de imagen no permitido. Los formatos permitidos son: PNG, JPG, JPEG y WEBP")).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("shows validation error if provider uploads oversized photo", async () => {
      const mockSubmit = vi.mocked(submitRegistration);
      const mockCategories = [{ id: 4, name: "Plomería" }];
      render(<RegistrationForm session={null} categories={mockCategories} />);

      const techButton = screen.getByText("Soy Prestador").closest("button");
      fireEvent.click(techButton!);
      const continueButton = screen.getByRole("button", { name: /Continuar/i });
      fireEvent.click(continueButton);

      const firstNameInput = screen.getByLabelText(/Nombre/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Apellido/i) as HTMLInputElement;
      const categorySelect = screen.getByLabelText(/Rubro/i) as HTMLSelectElement;

      fireEvent.change(firstNameInput, { target: { value: "Andres" } });
      fireEvent.change(lastNameInput, { target: { value: "Colina" } });
      fireEvent.change(categorySelect, { target: { value: "4" } });

      const hugeContent = new ArrayBuffer(6 * 1024 * 1024);
      const file = new File([hugeContent], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
      
      const originalGet = window.FormData.prototype.get;
      vi.spyOn(window.FormData.prototype, 'get').mockImplementation(function(this: FormData, key: string) {
        if (key === "profilePhoto") return file;
        return originalGet.call(this, key);
      });

      const submitButton = screen.getByRole("button", { name: /Finalizar Registro/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText("La imagen no debe superar los 5MB")).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  })
});
