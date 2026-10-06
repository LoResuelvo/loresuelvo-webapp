import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformanceNavigation } from "./PerformanceNavigation";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

describe("PerformanceNavigation", () => {
  it("renders tabs for activity, collections, reputation, and conversion", () => {
    render(<PerformanceNavigation active="conversion" />);

    const activityLink = screen.getByRole("link", { name: t.providerActivity.activity });
    expect(activityLink).toHaveAttribute("href", ROUTES.provider.activity);
    expect(activityLink).not.toHaveAttribute("aria-current");

    const collectionsLink = screen.getByRole("link", { name: t.providerCollections.collections });
    expect(collectionsLink).toHaveAttribute("href", ROUTES.provider.collections);
    expect(collectionsLink).not.toHaveAttribute("aria-current");

    const reputationLink = screen.getByRole("link", { name: t.providerReputation.reputation });
    expect(reputationLink).toHaveAttribute("href", ROUTES.provider.reputation);
    expect(reputationLink).not.toHaveAttribute("aria-current");

    const conversionLink = screen.getByRole("link", { name: t.providerConversion.conversion });
    expect(conversionLink).toHaveAttribute("href", ROUTES.provider.conversion);
    expect(conversionLink).toHaveAttribute("aria-current", "page");
  });
});
