"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/infrastructure/i18n/translations";
import { useCallback, useState } from "react";
import { useAddressAutocomplete } from "./useAddressAutocomplete";

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
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const handlePlaceSelected = useCallback(
    (address: { street: string; streetNumber: string }) => {
      setStreet(address.street);
      setStreetNumber(address.streetNumber);
      if (address.street) onClearStreet();
      if (address.streetNumber) onClearStreetNumber();
    },
    [onClearStreet, onClearStreetNumber]
  );
  const { inputRef: streetInputRef } = useAddressAutocomplete({
    onPlaceSelected: handlePlaceSelected,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="street" className="text-body font-semibold text-brand-primary">
          {t.onboarding.profileForm.street}
        </Label>
        <Input
          ref={streetInputRef}
          id="street"
          name="street"
          value={street}
          placeholder={t.onboarding.profileForm.streetPlaceholder}
          required
          aria-required="true"
          className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${streetError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={(event) => {
            setStreet(event.target.value);
            onClearStreet();
          }}
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
          value={streetNumber}
          placeholder={t.onboarding.profileForm.streetNumberPlaceholder}
          required
          aria-required="true"
          className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${streetNumberError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={(event) => {
            setStreetNumber(event.target.value);
            onClearStreetNumber();
          }}
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
        <Label htmlFor="unit" className="text-body font-semibold text-brand-primary">
          {t.onboarding.profileForm.apartment}
        </Label>
        <Input
          id="unit"
          name="unit"
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
