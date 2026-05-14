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

  it('shows the success message after submitting valid data', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "García");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("status")).toHaveTextContent("Cuenta creada exitosamente");
  });

  it("shows field error after submitting empty password", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "García");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("La contraseña es obligatoria")).toBeVisible();
  });

  it("shows field error after submitting empty email", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Apellido"), "García");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("El correo electrónico es obligatorio")).toBeVisible();
  });

  it("shows field error after submitting empty name", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Apellido"), "García");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("El nombre es obligatorio")).toBeVisible();
  });

  it("shows field error after submitting empty last name", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("El apellido es obligatorio")).toBeVisible();
  });
});

