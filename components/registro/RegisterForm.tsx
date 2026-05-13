"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form aria-label="Create account" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" type="text" placeholder="Ej. Ana" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last name">Apellido</Label>
          <Input id="last name" type="text" placeholder="Ej. García" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" type="email" placeholder="tu@email.com" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pr-10"
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

      <Button type="submit" size="lg" className="w-full mt-1">
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

      <Button type="button" variant="outline" className="w-full gap-2">
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
