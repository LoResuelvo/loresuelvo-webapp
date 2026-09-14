import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { t } from "@/infrastructure/i18n/translations";
import { IdentityVerificationResult } from "./IdentityVerificationResult";

describe("IdentityVerificationResult", () => {
  it("renders a loading status without exposing external details", () => {
    render(<IdentityVerificationResult status={null} isLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      t.onboarding.identityVerification.loading,
    );
    expect(screen.queryByText(/session_token|verification_url/i)).not.toBeInTheDocument();
  });

  it("renders a controlled read error and lets the user refresh", () => {
    const onRefresh = vi.fn();
    render(
      <IdentityVerificationResult
        status={null}
        error={t.onboarding.identityVerification.errorRead}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      t.onboarding.identityVerification.errorRead,
    );
    fireEvent.click(
      screen.getByRole("button", { name: t.onboarding.identityVerification.refresh }),
    );
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("renders result copy and refresh only for pending states", () => {
    render(
      <IdentityVerificationResult
        status="in_review"
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: t.onboarding.identityVerification.pendingTitle })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      t.onboarding.identityVerification.pendingDescription,
    );
    expect(
      screen.getByRole("button", { name: t.onboarding.identityVerification.refresh }),
    ).toBeInTheDocument();
  });

  it("does not show a refresh action for an approved result", () => {
    render(<IdentityVerificationResult status="approved" onRefresh={vi.fn()} />);

    expect(screen.getByRole("heading", { name: t.onboarding.identityVerification.verifiedTitle })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: t.onboarding.identityVerification.refresh }),
    ).not.toBeInTheDocument();
  });

  it("exposes the continuation action for a non-approved result", () => {
    const onContinue = vi.fn();
    render(
      <IdentityVerificationResult
        status="declined"
        onContinue={onContinue}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: t.onboarding.identityVerification.continueOnboarding,
      }),
    );

    expect(onContinue).toHaveBeenCalledOnce();
  });
});
