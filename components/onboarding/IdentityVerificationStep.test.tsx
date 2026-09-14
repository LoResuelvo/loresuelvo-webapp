import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IdentityVerificationStep } from "./IdentityVerificationStep";
import { t } from "@/infrastructure/i18n/translations";

describe("IdentityVerificationStep", () => {
  it("renders the optional invitation and account-created notice", () => {
    render(<IdentityVerificationStep onVerifyNow={vi.fn()} onLater={vi.fn()} />);

    expect(screen.getByRole("heading", { name: t.onboarding.identityVerification.title })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(t.onboarding.identityVerification.accountCreated);
    expect(screen.getByText(t.onboarding.identityVerification.subtitle)).toBeInTheDocument();
  });

  it("exposes keyboard-operable actions through semantic buttons", () => {
    const onVerifyNow = vi.fn();
    const onLater = vi.fn();
    render(<IdentityVerificationStep onVerifyNow={onVerifyNow} onLater={onLater} />);

    const verifyButton = screen.getByRole("button", { name: t.onboarding.identityVerification.verifyNow });
    const laterButton = screen.getByRole("button", { name: t.onboarding.identityVerification.later });

    fireEvent.click(verifyButton);
    fireEvent.click(laterButton);

    expect(onVerifyNow).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it("renders the approved confirmation without starting another session", () => {
    render(
      <IdentityVerificationStep
        status="approved"
        onVerifyNow={vi.fn()}
        onLater={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: t.onboarding.identityVerification.verifiedTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      t.onboarding.identityVerification.verifiedDescription,
    );
    expect(
      screen.queryByRole("button", {
        name: t.onboarding.identityVerification.verifyNow,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: t.onboarding.identityVerification.later,
      }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["in_review", t.onboarding.identityVerification.pendingTitle],
    ["declined", t.onboarding.identityVerification.declinedTitle],
    ["abandoned", t.onboarding.identityVerification.abandonedTitle],
    ["expired", t.onboarding.identityVerification.expiredTitle],
  ] as const)("renders the %s result", (status, title) => {
    render(
      <IdentityVerificationStep
        status={status}
        onVerifyNow={vi.fn()}
        onLater={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.onboarding.identityVerification.verifyNow })).not.toBeInTheDocument();
  });

  it("offers a refresh action only for a pending result", () => {
    const onRefresh = vi.fn();
    render(
      <IdentityVerificationStep
        status="in_review"
        onVerifyNow={vi.fn()}
        onLater={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: t.onboarding.identityVerification.refresh }),
    );

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("exposes continuation for an approved identity", () => {
    const onContinue = vi.fn();
    render(
      <IdentityVerificationStep
        status="approved"
        onVerifyNow={vi.fn()}
        onLater={vi.fn()}
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
