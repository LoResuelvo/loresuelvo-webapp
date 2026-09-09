"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

export type AddressAutocompleteStatus = "idle" | "ready" | "unavailable" | "error";

export interface AddressAutocompleteSelection {
  street: string;
  streetNumber: string;
}

export interface UseAddressAutocompleteOptions {
  apiKey?: string;
  onPlaceSelected: (address: AddressAutocompleteSelection) => void;
}

interface GoogleAddressComponent {
  long_name?: string;
  types?: readonly string[];
}

interface GooglePlace {
  address_components?: readonly GoogleAddressComponent[];
}

interface GoogleMapsListener {
  remove?: () => void;
}

interface GooglePlacesAutocomplete {
  addListener: (eventName: string, handler: () => void) => GoogleMapsListener;
  getPlace: () => GooglePlace;
}

interface GooglePlacesLibrary {
  Autocomplete: new (
    input: HTMLInputElement,
    options: {
      componentRestrictions: { country: string };
      fields: string[];
      types: string[];
    }
  ) => GooglePlacesAutocomplete;
}

interface GoogleMapsWindow {
  google?: {
    maps?: {
      places?: GooglePlacesLibrary;
    };
  };
}

function getExistingPlacesLibrary(): GooglePlacesLibrary | null {
  if (typeof window === "undefined") return null;

  const mapsWindow = window as unknown as GoogleMapsWindow;
  return mapsWindow.google?.maps?.places ?? null;
}

async function loadPlacesLibrary(apiKey: string): Promise<GooglePlacesLibrary> {
  const loader = new Loader({
    apiKey,
    libraries: ["places"],
  });
  const placesLibrary = await loader.importLibrary("places");
  return placesLibrary as unknown as GooglePlacesLibrary;
}

function readAddressComponent(
  components: readonly GoogleAddressComponent[] | undefined,
  type: string
): string {
  return components?.find((component) => component.types?.includes(type))?.long_name ?? "";
}

function readSelectedAddress(place: GooglePlace): AddressAutocompleteSelection {
  return {
    street: readAddressComponent(place.address_components, "route"),
    streetNumber: readAddressComponent(place.address_components, "street_number"),
  };
}

export function useAddressAutocomplete({
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  onPlaceSelected,
}: UseAddressAutocompleteOptions) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GooglePlacesAutocomplete | null>(null);
  const listenerRef = useRef<GoogleMapsListener | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const [status, setStatus] = useState<AddressAutocompleteStatus>("idle");

  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      listenerRef.current?.remove?.();
      listenerRef.current = null;
      autocompleteRef.current = null;
    };

    const input = inputRef.current;
    const existingPlacesLibrary = getExistingPlacesLibrary();

    if (!input) {
      setStatus("error");
      return cleanup;
    }

    if (!apiKey && !existingPlacesLibrary) {
      setStatus("unavailable");
      return cleanup;
    }

    const initializeAutocomplete = async () => {
      try {
        const placesLibrary = existingPlacesLibrary ?? (apiKey ? await loadPlacesLibrary(apiKey) : null);
        if (cancelled) return;
        if (!placesLibrary) {
          setStatus("unavailable");
          return;
        }

        const autocomplete = new placesLibrary.Autocomplete(input, {
          componentRestrictions: { country: "ar" },
          fields: ["address_components"],
          types: ["address"],
        });
        const listener = autocomplete.addListener("place_changed", () => {
          onPlaceSelectedRef.current(readSelectedAddress(autocomplete.getPlace()));
        });

        autocompleteRef.current = autocomplete;
        listenerRef.current = listener;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void initializeAutocomplete();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [apiKey]);

  return { inputRef, status };
}
