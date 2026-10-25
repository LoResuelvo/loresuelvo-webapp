import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PerformanceOverview from "./PerformanceOverview";
import { ROUTES } from "@/lib/routes";

describe("PerformanceOverview", () => {
  it("links to performance without presenting fabricated income or comparison", () => {
    render(<PerformanceOverview />);
    expect(screen.getByRole("complementary", { name: "Tu desempeño" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mi desempeño" })).toHaveAttribute("href", ROUTES.provider.activity);
    expect(screen.queryByText(/vs mes anterior/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });
});
