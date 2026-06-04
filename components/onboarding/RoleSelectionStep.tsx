"use client";

import { Button } from "@/components/ui/button";
import { Home, Wrench } from "lucide-react";
import { RoleSelectionCard } from "./RoleSelectionCard";

interface RoleSelectionStepProps {
  role: "consumer" | "provider" | null;
  onSelectRole: (role: "consumer" | "provider") => void;
  onContinue: () => void;
}

export function RoleSelectionStep({
  role,
  onSelectRole,
  onContinue,
}: RoleSelectionStepProps) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight text-brand-primary">
          LoResuelvo
        </h1>
        <p className="text-[15px] text-muted-foreground max-w-[320px] mx-auto">
          Selecciona cómo quieres usar LoResuelvo para personalizar tu experiencia
        </p>
      </div>

      <div className="space-y-4">
        <RoleSelectionCard
          id="role-consumer-btn"
          selected={role === "consumer"}
          onClick={() => onSelectRole("consumer")}
          title="Soy Cliente"
          description="Busco ayuda profesional para mi hogar"
          icon={Home}
        />

        <RoleSelectionCard
          id="role-provider-btn"
          selected={role === "provider"}
          onClick={() => onSelectRole("provider")}
          title="Soy Prestador"
          description="Quiero ofrecer mis servicios y hacer crecer mi negocio"
          icon={Wrench}
        />
      </div>

      <div className="pt-6">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!role}
          className={`h-[46px] w-full rounded-lg text-[15px] font-medium text-white transition-all duration-200 ${
            role
              ? "bg-brand-primary hover:bg-brand-primary/90 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed opacity-60"
          }`}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
