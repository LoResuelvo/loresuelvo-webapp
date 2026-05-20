"use client";

import { AuthSession } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { ChangeEvent, useState } from "react";

import { submitRegistration } from "@/app/onboarding/registrationButtonAction";

export default function RegistrationForm({ session }: { session: AuthSession | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      await submitRegistration(formData);
    } catch (err) {
      console.error(err);
      setError("Hubo un problema al guardar tu perfil. Inténtalo nuevamente.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-neutral p-4 font-sans">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight text-brand-primary">
            Te damos la bienvenida a<br />LoResuelvo
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Por favor completa tu perfil para seguir
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-[14px] font-semibold text-brand-primary">
              Nombre
            </Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="Ej. Juan"
              required
              className="h-[46px] rounded-lg border-border bg-brand-neutral/30 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-[14px] font-semibold text-brand-primary">
              Apellido
            </Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Ej. Pérez"
              required
              className="h-[46px] rounded-lg border-border bg-brand-neutral/30 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-[46px] w-full rounded-lg bg-brand-primary text-[15px] font-medium text-white transition-colors hover:bg-brand-primary/90"
            >
              {isLoading ? "Guardando..." : "Continuar"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
