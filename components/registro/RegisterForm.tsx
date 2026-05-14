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
const submitButtonClassName =
  "mt-1 w-full bg-[#1A2B48] text-white hover:bg-[#243a63]";
const successMessage = "Cuenta creada exitosamente";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);

  function handleSubmit(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessageVisible(false);

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setSuccessMessageVisible(true);
  }

  return (
    <form
      aria-label="Create account"
      autoComplete="on"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Ej. Ana"
            className={formFieldClassName}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Ej. García"
            className={formFieldClassName}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@email.com"
          className={formFieldClassName}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            className={cn("pr-10", formFieldClassName)}
            required
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
      </div>

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
