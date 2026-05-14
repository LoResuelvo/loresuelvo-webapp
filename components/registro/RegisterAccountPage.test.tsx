import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterAccountPage } from "./RegisterAccountPage";

describe("RegisterAccountPage", () => {
  it('shows the title "Crea tu cuenta"', () => {
    render(<RegisterAccountPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Crea tu cuenta" })).toBeVisible();
  });

  it('shows the subtitle "Completa tus datos para comenzar"', () => {
    render(<RegisterAccountPage />);
    expect(screen.getByText("Completa tus datos para comenzar")).toBeVisible();
  });

  it("shows the registration form", () => {
    render(<RegisterAccountPage />);
    expect(screen.getByRole("form", { name: "Create account" })).toBeVisible();
  });
});