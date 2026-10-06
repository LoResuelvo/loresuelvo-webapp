import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversionRequestsSection } from "./ConversionRequestsSection";
import type { ConversionRequests } from "@/domain/provider/conversion";
import { t } from "@/infrastructure/i18n/translations";

const mockRequests: ConversionRequests = {
  received: 8,
  accepted: 6,
  pending: 2,
  acceptanceRate: {
    numerator: 6,
    denominator: 8,
    percentage: 75,
  },
};

describe("ConversionRequestsSection", () => {
  it("renders requests metrics and acceptance rate", () => {
    render(<ConversionRequestsSection requests={mockRequests} />);

    const section = screen.getByTestId("conversion-requests-section");
    expect(section).toBeInTheDocument();
    expect(screen.getByText(t.providerConversion.requestsTitle)).toBeInTheDocument();

    const received = screen.getByTestId("requests-received");
    expect(received).toHaveTextContent(t.providerConversion.requestsReceived);
    expect(received).toHaveTextContent("8");

    const accepted = screen.getByTestId("requests-accepted");
    expect(accepted).toHaveTextContent(t.providerConversion.requestsAccepted);
    expect(accepted).toHaveTextContent("6");

    const pending = screen.getByTestId("requests-pending");
    expect(pending).toHaveTextContent(t.providerConversion.requestsPending);
    expect(pending).toHaveTextContent("2");

    const rate = screen.getByTestId("requests-acceptance-rate");
    expect(rate).toHaveTextContent(t.providerConversion.acceptanceRate);
    expect(rate).toHaveTextContent("6 de 8 recibidas (75 %)");
  });

  it("does not refer to acceptance as contracting or hire", () => {
    const { container } = render(<ConversionRequestsSection requests={mockRequests} />);
    const text = container.textContent || "";
    expect(/contratación|contratada|contratadas/i.test(text)).toBe(false);
  });

  it("renders accessible clarification that requests are independent", () => {
    render(<ConversionRequestsSection requests={mockRequests} />);
    expect(screen.getByText(t.providerConversion.requestsHelp)).toBeInTheDocument();
  });
});
