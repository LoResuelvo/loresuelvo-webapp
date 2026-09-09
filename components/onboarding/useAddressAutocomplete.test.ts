import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAddressAutocomplete,
  AddressAutocompleteSelection,
} from "./useAddressAutocomplete";

const loaderInstance = vi.hoisted(() => ({ importLibrary: vi.fn() }));
const loaderConstructor = vi.hoisted(() => vi.fn(function () {
  return loaderInstance;
}));

vi.mock("@googlemaps/js-api-loader", () => ({
  Loader: loaderConstructor,
}));

interface TestAutocomplete {
  addListener: (eventName: string, handler: () => void) => { remove: () => void };
  getPlace: () => { address_components?: Array<{ long_name: string; types: string[] }> };
}

interface TestWindow {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (input: HTMLInputElement, options: unknown) => TestAutocomplete;
      };
    };
  };
}

describe("useAddressAutocomplete", () => {
  beforeEach(() => {
    loaderConstructor.mockClear();
    loaderInstance.importLibrary.mockReset();
  });

  afterEach(() => {
    delete (window as unknown as TestWindow).google;
  });

  it("returns unavailable when no api key or preloaded Places library exists", async () => {
    const { result } = renderHook(() => {
      const hook = useAddressAutocomplete({ onPlaceSelected: vi.fn() });
      hook.inputRef.current = document.createElement("input");
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(loaderConstructor).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only api key as unavailable without loading Places", async () => {
    const { result } = renderHook(() => {
      const hook = useAddressAutocomplete({ apiKey: "   ", onPlaceSelected: vi.fn() });
      hook.inputRef.current = document.createElement("input");
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(loaderConstructor).not.toHaveBeenCalled();
  });

  it("loads Places with the Argentina address restrictions", async () => {
    const removeListener = vi.fn();
    let placeChanged: (() => void) | undefined;
    const selectedAddress: AddressAutocompleteSelection = {
      street: "Av. Rivadavia",
      streetNumber: "5100",
    };
    const autocompleteOptions: unknown[] = [];
    const Autocomplete = vi.fn(function (_input: HTMLInputElement, options: unknown) {
      autocompleteOptions.push(options);
      return {
        addListener: (_eventName: string, handler: () => void) => {
          placeChanged = handler;
          return { remove: removeListener };
        },
        getPlace: () => ({
          address_components: [
            { long_name: selectedAddress.street, types: ["route"] },
            { long_name: selectedAddress.streetNumber, types: ["street_number"] },
          ],
        }),
      } satisfies TestAutocomplete;
    });

    loaderInstance.importLibrary.mockResolvedValue({ Autocomplete });
    const onPlaceSelected = vi.fn<(address: AddressAutocompleteSelection) => void>();
    const { result, unmount } = renderHook(() => {
      const hook = useAddressAutocomplete({ apiKey: "test-key", onPlaceSelected });
      hook.inputRef.current = document.createElement("input");
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(loaderConstructor).toHaveBeenCalledWith({ apiKey: "test-key", libraries: ["places"] });
    expect(autocompleteOptions[0]).toEqual({
      componentRestrictions: { country: "ar" },
      fields: ["address_components"],
      types: ["address"],
    });

    act(() => placeChanged?.());
    expect(onPlaceSelected).toHaveBeenCalledWith(selectedAddress);

    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it("uses a preloaded Places library without requiring a mock flag", async () => {
    const removeListener = vi.fn();
    const Autocomplete = vi.fn(function () {
      return {
        addListener: () => ({ remove: removeListener }),
        getPlace: () => ({ address_components: [] }),
      } satisfies TestAutocomplete;
    });
    (window as unknown as TestWindow).google = { maps: { places: { Autocomplete } } };

    const { result, unmount } = renderHook(() => {
      const hook = useAddressAutocomplete({ onPlaceSelected: vi.fn() });
      hook.inputRef.current = document.createElement("input");
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(loaderConstructor).not.toHaveBeenCalled();

    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it("reports an error when Places cannot initialize", async () => {
    const Autocomplete = vi.fn(function () {
      throw new Error("Places unavailable");
    });
    loaderInstance.importLibrary.mockResolvedValue({ Autocomplete });

    const { result } = renderHook(() => {
      const hook = useAddressAutocomplete({ apiKey: "test-key", onPlaceSelected: vi.fn() });
      hook.inputRef.current = document.createElement("input");
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("degrades to unavailable when the Places loader rejects", async () => {
    loaderInstance.importLibrary.mockRejectedValue(new Error("Places loader unavailable"));

    const { result } = renderHook(() => {
      const hook = useAddressAutocomplete({ apiKey: "test-key", onPlaceSelected: vi.fn() });
      hook.inputRef.current = document.createElement("input");
      return hook;
    });

    await waitFor(() => expect(result.current.status).toBe("unavailable"));
  });
});
