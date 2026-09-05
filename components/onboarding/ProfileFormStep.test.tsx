import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfileFormStep } from "./ProfileFormStep";
import { t } from "@/infrastructure/i18n/translations";

if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-avatar-url");
}

vi.mock("@/app/actions/coverage-zones", () => ({
  getCoverageZonesAction: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 6, name: "Comuna 6" },
      { id: 14, name: "Comuna 14" },
    ],
  }),
}));

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

  it("does not render coverage zone selector for consumer role", () => {
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

    expect(screen.queryByTestId("coverage-zones-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("coverage-zones-list")).not.toBeInTheDocument();
  });

  it("renders coverage zone selector for provider role", () => {
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

    expect(screen.getByTestId("coverage-zones-loading")).toBeInTheDocument();
  });

  it("does not submit provider form without selecting coverage zones", () => {
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

    fireEvent.change(screen.getByLabelText(t.onboarding.profileForm.name), {
      target: { value: "Carlos" },
    });
    fireEvent.change(screen.getByLabelText(t.onboarding.profileForm.surname), {
      target: { value: "López" },
    });
    fireEvent.change(screen.getByLabelText("Rubro"), {
      target: { value: "1" },
    });

    const submitBtn = screen.getByRole("button", { name: t.onboarding.profileForm.finishRegister });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});

