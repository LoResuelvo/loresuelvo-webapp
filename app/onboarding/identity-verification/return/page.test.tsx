import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { t } from "@/infrastructure/i18n/translations";
import IdentityVerificationReturnPage from "./page";

vi.mock("@/components/onboarding/useIdentityVerificationStatus", () => ({
  useIdentityVerificationStatus: vi.fn(() => ({
    status: "declined",
    isLoading: false,
    isRefreshing: false,
    timedOut: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

describe("IdentityVerificationReturnPage", () => {
  it("renders the result from the authenticated profile", () => {
    render(<IdentityVerificationReturnPage />);

    expect(
      screen.getByRole("heading", {
        name: t.onboarding.identityVerification.declinedTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/session_token|verification_url/i)).not.toBeInTheDocument();
  });
});
