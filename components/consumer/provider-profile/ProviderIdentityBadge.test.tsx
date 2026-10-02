import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderIdentityBadge } from "./ProviderIdentityBadge";

describe("ProviderIdentityBadge", () => {
  it("shows the verified identity as informative text", () => {
    render(<ProviderIdentityBadge identityVerified={true} />);
    expect(screen.getByText("Identidad verificada")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("omits the indicator for an unverified identity", () => {
    const { container } = render(<ProviderIdentityBadge identityVerified={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
