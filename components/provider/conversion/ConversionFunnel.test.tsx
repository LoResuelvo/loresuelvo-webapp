import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversionFunnel } from "./ConversionFunnel";
import type { ProviderConversion } from "@/domain/provider/conversion";
import { t } from "@/infrastructure/i18n/translations";

const mockConversion: ProviderConversion = {
  period: {
    from: "2026-08-01T00:00:00-03:00",
    to: "2026-08-31T00:00:00-03:00",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  observedAt: "2026-09-15T10:30:00-03:00",
  proposals: {
    stages: {
      issued: 10,
      contracted: 6,
      reported: 4,
      paid: 2,
    },
    rates: {
      contracted: {
        cohort: { numerator: 6, denominator: 10, percentage: 60 },
        previousStage: { numerator: 6, denominator: 10, percentage: 60 },
      },
      reported: {
        cohort: { numerator: 4, denominator: 10, percentage: 40 },
        previousStage: { numerator: 4, denominator: 6, percentage: 66.67 },
      },
      paid: {
        cohort: { numerator: 2, denominator: 10, percentage: 20 },
        previousStage: { numerator: 2, denominator: 4, percentage: 50 },
      },
    },
    uncontracted: 4,
  },
  requests: {
    received: 15,
    accepted: 10,
    pending: 2,
    acceptanceRate: {
      numerator: 10,
      denominator: 15,
      percentage: 66.67,
    },
  },
};

describe("ConversionFunnel", () => {
  it("renders the 4 funnel stages with their counts and rates", () => {
    render(<ConversionFunnel data={mockConversion} />);

    const issuedStage = screen.getByTestId("funnel-stage-issued");
    expect(issuedStage).toHaveTextContent(t.providerConversion.issued);
    expect(issuedStage).toHaveTextContent("10");

    const contractedStage = screen.getByTestId("funnel-stage-contracted");
    expect(contractedStage).toHaveTextContent(t.providerConversion.contracted);
    expect(contractedStage).toHaveTextContent("6");
    expect(contractedStage).toHaveTextContent("6 de 10 emitidas (60 %)");

    const reportedStage = screen.getByTestId("funnel-stage-reported");
    expect(reportedStage).toHaveTextContent(t.providerConversion.reported);
    expect(reportedStage).toHaveTextContent("4");
    expect(reportedStage).toHaveTextContent("4 de 10 emitidas (40 %)");
    expect(reportedStage).toHaveTextContent("4 de 6 contratadas (66,67 %)");

    const paidStage = screen.getByTestId("funnel-stage-paid");
    expect(paidStage).toHaveTextContent(t.providerConversion.paid);
    expect(paidStage).toHaveTextContent("2");
    expect(paidStage).toHaveTextContent("2 de 10 emitidas (20 %)");
    expect(paidStage).toHaveTextContent("2 de 4 con finalización informada (50 %)");
  });

  it("renders uncontracted proposals without words like rechazadas or perdidas", () => {
    const { container } = render(<ConversionFunnel data={mockConversion} />);

    const uncontracted = screen.getByTestId("uncontracted-proposals");
    expect(uncontracted).toHaveTextContent(t.providerConversion.uncontracted);
    expect(uncontracted).toHaveTextContent("4");

    const text = container.textContent || "";
    expect(/rechazada|rechazadas|perdida|perdidas/i.test(text)).toBe(false);
  });

  it("renders effective period, observed at, and cohort help text", () => {
    render(<ConversionFunnel data={mockConversion} />);

    const period = screen.getByTestId("conversion-period");
    expect(period).toBeInTheDocument();
    expect(period).toHaveTextContent("1/8/26");
    expect(period).toHaveTextContent("31/8/26");

    const observed = screen.getByTestId("conversion-observed-at");
    expect(observed).toHaveTextContent(t.providerConversion.observedAt);
    expect(observed).toHaveTextContent("15/9/26");

    expect(screen.getByText(t.providerConversion.cohortHelp)).toBeInTheDocument();
  });
});
