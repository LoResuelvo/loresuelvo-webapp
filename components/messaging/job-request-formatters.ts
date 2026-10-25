import type { ServiceAddress } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";

export function formatJobRequestAddress(address?: ServiceAddress | null): string {
  if (!address) return t.requestDetails.addressPending;

  const street = [address.street, address.streetNumber].filter(Boolean).join(" ").trim();
  const details = [
    address.floor && `${t.requestDetails.floorLabel} ${address.floor}`,
    address.unit && `${t.requestDetails.unitLabel} ${address.unit}`,
  ].filter(Boolean);
  const formattedAddress = [street, ...details].filter(Boolean).join(", ");

  return formattedAddress || t.requestDetails.addressPending;
}

export function formatJobRequestCreatedDate(createdOn?: string | null): string | undefined {
  if (!createdOn) return undefined;

  const date = new Date(createdOn);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
