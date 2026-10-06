import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformanceNavigation } from "./PerformanceNavigation";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";

describe("PerformanceNavigation", () => {
  it("renders tabs for activity, collections, and reputation", () => {
    render(<PerformanceNavigation active="reputation" />);

    const activityLink = screen.getByRole("link", { name: t.providerActivity.activity });
    expect(activityLink).toHaveAttribute("href", ROUTES.provider.activity);
    expect(activityLink).not.toHaveAttribute("aria-current");

    const collectionsLink = screen.getByRole("link", { name: t.providerCollections.collections });
    expect(collectionsLink).toHaveAttribute("href", ROUTES.provider.collections);
    expect(collectionsLink).not.toHaveAttribute("aria-current");

    const reputationLink = screen.getByRole("link", { name: t.providerReputation.reputation });
    expect(reputationLink).toHaveAttribute("href", ROUTES.provider.reputation);
    expect(reputationLink).toHaveAttribute("aria-current", "page");
  });
});
