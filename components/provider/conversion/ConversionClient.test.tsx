import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversionClient } from "./ConversionClient";
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
    stages: { issued: 10, contracted: 6, reported: 4, paid: 2 },
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
    acceptanceRate: { numerator: 10, denominator: 15, percentage: 66.67 },
  },
};

describe("ConversionClient", () => {
  it("renders loading state when initialPending is true", () => {
    render(<ConversionClient initialPending />);
    expect(screen.getByRole("status")).toHaveTextContent(t.providerConversion.loading);
  });

  it("renders error view and supports retry when initialResult is unsuccessful", async () => {
    const user = userEvent.setup();
    const mockAction = vi.fn().mockResolvedValue({
      success: true,
      data: mockConversion,
    });

    render(
      <ConversionClient
        initialResult={{ success: false, error: "Error de prueba" }}
        getConversionAction={mockAction}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Error de prueba");

    const retryBtn = screen.getByRole("button", { name: t.providerConversion.retry });
    await user.click(retryBtn);

    expect(mockAction).toHaveBeenCalled();
    expect(await screen.findByTestId("funnel-stage-issued")).toBeInTheDocument();
  });

  it("renders funnel directly when initialResult is successful", () => {
    render(<ConversionClient initialResult={{ success: true, data: mockConversion }} />);
    expect(screen.getByTestId("funnel-stage-issued")).toBeInTheDocument();
    expect(screen.getByTestId("conversion-period")).toBeInTheDocument();
  });
});
