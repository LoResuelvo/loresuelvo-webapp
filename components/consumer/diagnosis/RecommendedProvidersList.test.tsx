import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecommendedProvidersList } from "./RecommendedProvidersList";
import { RecommendedProvider } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";
import { ROUTES } from "@/lib/routes";

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("RecommendedProvidersList", () => {
  const mockProviders: RecommendedProvider[] = [
    {
      id: 1,
      name: "Juan",
      surname: "Pérez",
      categoryName: "Plomería",
      profilePhotoUrl: "https://example.com/photo.jpg",
    },
    {
      id: 2,
      name: "María",
      surname: "Gómez",
      categoryName: "Electricidad",
    },
  ];

  it("should render provider cards when providers are present", () => {
    render(<RecommendedProvidersList providers={mockProviders} diagnosisCompleted={true} />);
    expect(screen.getByText(t.aiDiagnosis.recommendedProviders)).toBeInTheDocument();
    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(1); // One has image, one has fallback
  });

  it("should display provider name and surname", () => {
    render(<RecommendedProvidersList providers={mockProviders} diagnosisCompleted={true} />);
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María Gómez")).toBeInTheDocument();
  });

  it("should display provider category name", () => {
    render(<RecommendedProvidersList providers={mockProviders} diagnosisCompleted={true} />);
    expect(screen.getByText("Plomería")).toBeInTheDocument();
    expect(screen.getByText("Electricidad")).toBeInTheDocument();
  });

  it("should render provider avatar with profile photo", () => {
    render(<RecommendedProvidersList providers={mockProviders} diagnosisCompleted={true} />);
    const avatarImg = screen.getByTestId("avatar-img-1");
    expect(avatarImg).toHaveAttribute("src", "https://example.com/photo.jpg");
    
    // Fallback for the second provider
    const avatarFallback = screen.getByTestId("avatar-fallback-2");
    expect(avatarFallback).toBeInTheDocument();
  });

  it("should render InfoBanner when providers array is empty but diagnosis is completed", () => {
    render(<RecommendedProvidersList providers={[]} diagnosisCompleted={true} />);
    expect(screen.getByText(t.aiDiagnosis.noProvidersFound)).toBeInTheDocument();
  });

  it("should not render anything when diagnosis is not completed", () => {
    const { container } = render(<RecommendedProvidersList providers={mockProviders} diagnosisCompleted={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
