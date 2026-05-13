import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterForm } from "./RegisterForm";

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
});