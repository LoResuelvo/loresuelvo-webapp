import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecommendedProviderCard } from "./RecommendedProviderCard";
import { RecommendedProvider } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";

describe("RecommendedProviderCard", () => {
  const mockProvider: RecommendedProvider = {
    id: 1,
    name: "Juan",
    surname: "Pérez",
    categoryName: "Plomería",
    profilePhotoUrl: "https://example.com/photo.jpg",
  };

  it("should display provider name and surname", () => {
    render(<RecommendedProviderCard provider={mockProvider} />);
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("should display provider category name", () => {
    render(<RecommendedProviderCard provider={mockProvider} />);
    expect(screen.getByText("Plomería")).toBeInTheDocument();
  });

  it("should render provider avatar with profile photo", () => {
    render(<RecommendedProviderCard provider={mockProvider} />);
    const avatarImg = screen.getByTestId("avatar-img-1");
    expect(avatarImg).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("should render a 'Contactar' button when assessment is professional_required", () => {
    const assessment = { outcome: "professional_required" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
        onContactProvider={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: t.aiDiagnosis.contactProvider })).toBeInTheDocument();
  });

  it("should call onContactProvider with provider id when button is clicked", async () => {
    const onContactProvider = vi.fn().mockResolvedValue(undefined);
    const assessment = { outcome: "professional_required" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
        onContactProvider={onContactProvider}
      />
    );
    const button = screen.getByRole("button", { name: t.aiDiagnosis.contactProvider });
    fireEvent.click(button);
    expect(onContactProvider).toHaveBeenCalledWith(1);
  });

  it("should disable button and show loading text while sending", async () => {
    let resolvePromise: (value: void) => void = () => {};
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const onContactProvider = vi.fn().mockReturnValue(promise);
    const assessment = { outcome: "professional_required" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
        onContactProvider={onContactProvider}
      />
    );
    const button = screen.getByRole("button", { name: t.aiDiagnosis.contactProvider });
    fireEvent.click(button);
    
    const sendingButton = screen.getByRole("button", { name: t.aiDiagnosis.jobRequestSending });
    expect(sendingButton).toBeDisabled();

    resolvePromise();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: t.aiDiagnosis.jobRequestSending })).not.toBeInTheDocument();
    });
  });

  it("should show success feedback after job request is sent", async () => {
    const onContactProvider = vi.fn().mockResolvedValue(undefined);
    const assessment = { outcome: "professional_required" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
        onContactProvider={onContactProvider}
      />
    );
    const button = screen.getByRole("button", { name: t.aiDiagnosis.contactProvider });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(t.aiDiagnosis.jobRequestSent)).toBeInTheDocument();
    });
  });

  it("should show error message when request fails", async () => {
    const onContactProvider = vi.fn().mockRejectedValue(new Error("Network Error"));
    const assessment = { outcome: "professional_required" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
        onContactProvider={onContactProvider}
      />
    );
    const button = screen.getByRole("button", { name: t.aiDiagnosis.contactProvider });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(t.aiDiagnosis.jobRequestError)).toBeInTheDocument();
    });
  });

  it("should show duplicate error message on 409", async () => {
    const error = Object.assign(new Error("Conflict"), { status: 409 });
    const onContactProvider = vi.fn().mockRejectedValue(error);
    const assessment = { outcome: "professional_required" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
        onContactProvider={onContactProvider}
      />
    );
    const button = screen.getByRole("button", { name: t.aiDiagnosis.contactProvider });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(t.aiDiagnosis.jobRequestDuplicate)).toBeInTheDocument();
    });
  });

  it("should NOT render contact buttons when assessment is collecting_information", () => {
    const assessment = { outcome: "collecting_information" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
      />
    );
    expect(screen.queryByRole("button", { name: t.aiDiagnosis.contactProvider })).not.toBeInTheDocument();
  });

  it("should NOT render contact buttons when assessment is self_service", () => {
    const assessment = { outcome: "self_service" as const };
    render(
      <RecommendedProviderCard
        provider={mockProvider}
        assessment={assessment}
      />
    );
    expect(screen.queryByRole("button", { name: t.aiDiagnosis.contactProvider })).not.toBeInTheDocument();
  });

  it("should add data-testid='recommended-provider' to the provider card", () => {
    render(<RecommendedProviderCard provider={mockProvider} />);
    const card = screen.getByTestId("recommended-provider");
    expect(card).toBeInTheDocument();
  });
});
