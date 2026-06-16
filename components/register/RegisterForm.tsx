"use client";

import { type ChangeEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const formFieldClassName = "bg-muted/80";
const submitButtonClassName = "mt-1 w-full bg-[#1A2B48] text-white hover:bg-[#243a63]";
const successMessage = "Cuenta creada exitosamente";

type RegisterFieldName = "firstName" | "lastName" | "email" | "password";
type RegisterFieldErrors = Partial<Record<RegisterFieldName, string>>;

const fieldErrorMessages: Record<RegisterFieldName, string> = {
  firstName: "El nombre es obligatorio",
  lastName: "El apellido es obligatorio",
  email: "El correo electrónico es obligatorio",
  password: "La contraseña es obligatoria",
};

function validateRegisterForm(form: HTMLFormElement): RegisterFieldErrors {
  const formData = new FormData(form);
  const errors: RegisterFieldErrors = {};

  for (const fieldName of Object.keys(fieldErrorMessages) as RegisterFieldName[]) {
    const value = formData.get(fieldName);
    if (typeof value !== "string" || value.trim() === "") {
      errors[fieldName] = fieldErrorMessages[fieldName];
    }
  }

  return errors;
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  function clearFieldError(fieldName: RegisterFieldName) {
    setFieldErrors((current) => {
      if (!current[fieldName]) return current;
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  }

  function fieldInputProps(name: RegisterFieldName) {
    const error = fieldErrors[name];
    return {
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": error ? `${name}-error` : undefined,
      onChange: () => clearFieldError(name),
    };
  }

  function handleSubmit(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessageVisible(false);

    const form = event.currentTarget;
    const errors = validateRegisterForm(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSuccessMessageVisible(true);
  }

  return (
    <form
      aria-label="Create account"
      autoComplete="on"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField id="firstName" label="Nombre" error={fieldErrors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Ej. Ana"
            className={formFieldClassName}
            {...fieldInputProps("firstName")}
          />
        </FormField>

        <FormField id="lastName" label="Apellido" error={fieldErrors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Ej. García"
            className={formFieldClassName}
            {...fieldInputProps("lastName")}
          />
        </FormField>
      </div>

      <FormField id="email" label="Correo electrónico" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@email.com"
          className={formFieldClassName}
          {...fieldInputProps("email")}
        />
      </FormField>

      <FormField id="password" label="Contraseña" error={fieldErrors.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            className={cn("pr-10", formFieldClassName)}
            {...fieldInputProps("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </FormField>

      {successMessageVisible ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {successMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" className={submitButtonClassName}>
        Crear cuenta
      </Button>

      <div className="relative my-1">
        <Separator />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-widest">
            o regístrate con
          </span>
        </span>
      </div>

      <Button type="button" variant="outline" className="w-fit gap-2 self-center px-8">
        <GoogleIcon />
        Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{" "}
        <a href="/login" className="font-semibold text-foreground hover:underline">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}
