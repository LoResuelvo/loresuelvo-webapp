"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { Category } from "@/lib/api/types";
import { CategorySelect } from "./CategorySelect";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;

interface ProfileFormStepProps {
  onBack: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  role: "consumer" | "provider" | null;
  categories: Category[];
}

export function ProfileFormStep({
  onBack,
  onSubmit,
  isLoading,
  error,
  role,
  categories,
}: ProfileFormStepProps) {
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(null);

  async function handleFormSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setFirstNameError(null);
    setLastNameError(null);
    setCategoryError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const categoryId = formData.get("categoryId") as string;

    let hasErrors = false;
    if (!firstName || firstName.trim() === "") {
      setFirstNameError("Campo obligatorio");
      hasErrors = true;
    }
    if (!lastName || lastName.trim() === "") {
      setLastNameError("Campo obligatorio");
      hasErrors = true;
    }

    if (role === "provider") {
      if (!categoryId || categoryId === "") {
        setCategoryError("Debe seleccionar un rubro");
        hasErrors = true;
      }

      const profilePhoto = formData.get("profilePhoto") as File;
      if (!profilePhoto || (profilePhoto.size === 0 && profilePhoto.name === "")) {
        setProfilePhotoError("La foto de perfil es obligatoria");
        hasErrors = true;
      } else {
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!validTypes.includes(profilePhoto.type)) {
          setProfilePhotoError("Formato de imagen no permitido. Los formatos permitidos son: PNG, JPG, JPEG y WEBP");
          hasErrors = true;
        } else if (profilePhoto.size > MAX_PROFILE_PHOTO_SIZE) {
          setProfilePhotoError("La imagen no debe superar los 5MB");
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      return;
    }

    await onSubmit(formData);
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center text-sm font-semibold text-muted-foreground hover:text-brand-primary transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
      </button>

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight text-brand-primary">
          Completar Perfil
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Por favor completa tus datos para finalizar el registro
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
        {role === "provider" && (
          <ProfilePhotoUpload
            onPhotoSelected={(file) => {
              if (file) {
                const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
                if (!validTypes.includes(file.type)) {
                  setProfilePhotoError("Formato de imagen no permitido. Los formatos permitidos son: PNG, JPG, JPEG y WEBP");
                } else if (file.size > MAX_PROFILE_PHOTO_SIZE) {
                  setProfilePhotoError("La imagen no debe superar los 5MB");
                } else {
                  setProfilePhotoError(null);
                }
              } else {
                setProfilePhotoError(null);
              }
            }}
            error={profilePhotoError}
          />
        )}
        
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-[14px] font-semibold text-brand-primary">
            Nombre
          </Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Ej. Juan"
            required
            autoFocus
            className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${firstNameError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            onChange={() => setFirstNameError(null)}
          />
          {firstNameError && (
            <p className="text-sm text-destructive" role="alert">
              {firstNameError}
            </p>
          )}
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
            className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${lastNameError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            onChange={() => setLastNameError(null)}
          />
          {lastNameError && (
            <p className="text-sm text-destructive" role="alert">
              {lastNameError}
            </p>
          )}
        </div>

        {role === "provider" && (
          <CategorySelect
            categories={categories}
            error={categoryError}
            onChange={() => setCategoryError(null)}
          />
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="h-[46px] w-full rounded-lg bg-brand-primary text-[15px] font-medium text-white transition-colors hover:bg-brand-primary/90"
          >
            {isLoading ? "Guardando..." : "Finalizar Registro"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
