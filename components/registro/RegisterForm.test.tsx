import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterForm } from "./RegisterForm";
import userEvent from "@testing-library/user-event";

describe("RegisterForm", () => {
  it("shows the name field", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Nombre")).toBeVisible();
  });

  it("shows the last name field", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Apellido")).toBeVisible();
  });

  it("shows the email field", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Correo electrónico")).toBeVisible();
  });

  it("shows the password field", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Contraseña")).toBeVisible();
  });

  it('shows the "Crear cuenta" button', () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
  });

  it("the user can toggle password visibility", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    const passwordInput = screen.getByLabelText("Contraseña");
    const toggleButton = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});