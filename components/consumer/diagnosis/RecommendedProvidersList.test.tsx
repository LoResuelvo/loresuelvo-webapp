import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecommendedProvidersList } from "./RecommendedProvidersList";
import { RecommendedProvider } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";

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
    const cards = screen.getAllByTestId("recommended-provider");
    expect(cards).toHaveLength(2);
  });

  it("should render InfoBanner when providers array is empty but diagnosis is completed", () => {
    render(<RecommendedProvidersList providers={[]} diagnosisCompleted={true} />);
    expect(screen.getByText(t.aiDiagnosis.noProvidersFound)).toBeInTheDocument();
  });

  it("should not render anything when diagnosis is not completed", () => {
    const { container } = render(<RecommendedProvidersList providers={mockProviders} diagnosisCompleted={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should not render anything when assessment is collecting_information", () => {
    const assessment = { outcome: "collecting_information" as const };
    const { container } = render(<RecommendedProvidersList providers={mockProviders} assessment={assessment} />);
    expect(container).toBeEmptyDOMElement();
  });
});
