import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfileFormStep } from "./ProfileFormStep";
import { t } from "@/infrastructure/i18n/translations";

if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-avatar-url");
}

describe("ProfileFormStep", () => {
  const mockOnBack = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockCategories = [{ id: 1, name: "Plomería" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders back button, title, and inputs", () => {
    render(
      <ProfileFormStep
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        isLoading={false}
        error={null}
        role="consumer"
        categories={[]}
      />
    );

    expect(screen.getByText(t.onboarding.profileForm.back)).toBeInTheDocument();
    expect(screen.getByText(t.onboarding.profileForm.title)).toBeInTheDocument();
    expect(screen.getByLabelText(t.onboarding.profileForm.name)).toBeInTheDocument();
    expect(screen.getByLabelText(t.onboarding.profileForm.surname)).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    render(
      <ProfileFormStep
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        isLoading={false}
        error={null}
        role="consumer"
        categories={[]}
      />
    );

    fireEvent.click(screen.getByText(t.onboarding.profileForm.back));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("renders category selector when role is provider", () => {
    render(
      <ProfileFormStep
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        isLoading={false}
        error={null}
        role="provider"
        categories={mockCategories}
      />
    );

    expect(screen.getByLabelText("Rubro")).toBeInTheDocument();
  });

  it("shows error alert when error prop is provided", () => {
    render(
      <ProfileFormStep
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        isLoading={false}
        error="Hubo un error al guardar"
        role="consumer"
        categories={[]}
      />
    );

    expect(screen.getByText("Hubo un error al guardar")).toBeInTheDocument();
  });
});
