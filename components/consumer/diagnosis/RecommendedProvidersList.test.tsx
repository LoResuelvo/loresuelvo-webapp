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

const buildProviders = (count: number): RecommendedProvider[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Nombre${i + 1}`,
    surname: `Apellido${i + 1}`,
    categoryName: "Plomería",
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

describe("RecommendedProvidersList - scrollable container when many providers", () => {
  it("renders all providers when 5 or fewer are available (no scroll container)", () => {
    render(<RecommendedProvidersList providers={buildProviders(3)} diagnosisCompleted={true} />);
    expect(screen.getAllByTestId("recommended-provider")).toHaveLength(3);
    expect(screen.queryByTestId("providers-scroll-container")).not.toBeInTheDocument();
  });

  it("renders all providers inside a scrollable container when more than 5 are available", () => {
    render(<RecommendedProvidersList providers={buildProviders(23)} diagnosisCompleted={true} />);
    expect(screen.getAllByTestId("recommended-provider")).toHaveLength(23);
    expect(screen.getByTestId("providers-scroll-container")).toBeInTheDocument();
  });

  it("wraps the providers in a scroll container at exactly 6 providers", () => {
    render(<RecommendedProvidersList providers={buildProviders(6)} diagnosisCompleted={true} />);
    expect(screen.getByTestId("providers-scroll-container")).toBeInTheDocument();
  });

  it("does not wrap providers in a scroll container at exactly 5 providers", () => {
    render(<RecommendedProvidersList providers={buildProviders(5)} diagnosisCompleted={true} />);
    expect(screen.queryByTestId("providers-scroll-container")).not.toBeInTheDocument();
  });

  it("shows the total count of professionals available", () => {
    render(<RecommendedProvidersList providers={buildProviders(23)} diagnosisCompleted={true} />);
    expect(screen.getByText(t.aiDiagnosis.professionalsCount(23))).toBeInTheDocument();
  });
});
