import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CurrentUser } from "@/domain/user/types";
import ProfileView from "./ProfileView";

const consumerProfile: CurrentUser = {
  id: 1,
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  role: "consumer",
  profilePhoto: null,
  calendarConnectionStatus: "disconnected",
};

const providerProfile: CurrentUser = {
  ...consumerProfile,
  role: "provider",
};

describe("ProfileView", () => {
  it("renders the profile heading and calendar integration", () => {
    render(<ProfileView user={consumerProfile} paymentAccountConnection={null} />);

    expect(screen.getByRole("heading", { name: "Mi perfil" })).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Google Calendar" })).toBeInTheDocument();
    expect(screen.getByText("No vinculada", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Mercado Pago" })).not.toBeInTheDocument();
  });

  it("renders Mercado Pago for providers using the supplied account status", () => {
    render(
      <ProfileView
        user={providerProfile}
        paymentAccountConnection={{
          status: "pending",
          canReceivePayments: false,
          canSendServiceProposals: false,
        }}
      />,
    );

    expect(screen.getByRole("region", { name: "Mercado Pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vincular Mercado Pago" })).toBeInTheDocument();
  });
});
