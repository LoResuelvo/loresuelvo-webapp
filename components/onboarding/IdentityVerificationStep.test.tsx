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
});
