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

describe("ProfileView", () => {
  it("renders the profile heading and calendar integration", () => {
    render(<ProfileView user={consumerProfile} />);

    expect(screen.getByRole("heading", { name: "Mi perfil" })).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Google Calendar" })).toBeInTheDocument();
    expect(screen.getByText("No vinculada", { exact: true })).toBeInTheDocument();
  });
});
