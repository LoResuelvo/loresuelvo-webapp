"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/infrastructure/i18n/translations";

interface ProfileAddressFieldsProps {
  streetError: string | null;
  streetNumberError: string | null;
  onClearStreet: () => void;
  onClearStreetNumber: () => void;
}

function StreetFields({
  streetError,
  streetNumberError,
  onClearStreet,
  onClearStreetNumber,
}: ProfileAddressFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="street" className="text-body font-semibold text-brand-primary">
          {t.onboarding.profileForm.street}
        </Label>
        <Input
          id="street"
          name="street"
          placeholder={t.onboarding.profileForm.streetPlaceholder}
          required
          aria-required="true"
          className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${streetError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={onClearStreet}
        />
        {streetError && <p className="text-sm text-destructive" role="alert">{streetError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="streetNumber" className="text-body font-semibold text-brand-primary">
          {t.onboarding.profileForm.streetNumber}
        </Label>
        <Input
          id="streetNumber"
          name="streetNumber"
          placeholder={t.onboarding.profileForm.streetNumberPlaceholder}
          required
          aria-required="true"
          className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${streetNumberError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={onClearStreetNumber}
        />
        {streetNumberError && <p className="text-sm text-destructive" role="alert">{streetNumberError}</p>}
      </div>
    </div>
  );
}

function OptionalAddressFields() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="floor" className="text-body font-semibold text-brand-primary">
          {t.onboarding.profileForm.floor}
        </Label>
        <Input
          id="floor"
          name="floor"
          placeholder={t.onboarding.profileForm.floorPlaceholder}
          className="h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apartment" className="text-body font-semibold text-brand-primary">
          {t.onboarding.profileForm.apartment}
        </Label>
        <Input
          id="apartment"
          name="apartment"
          placeholder={t.onboarding.profileForm.apartmentPlaceholder}
          className="h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary"
        />
      </div>
    </div>
  );
}

export function ProfileAddressFields(props: ProfileAddressFieldsProps) {
  return (
    <>
      <StreetFields {...props} />
      <OptionalAddressFields />
    </>
  );
}
