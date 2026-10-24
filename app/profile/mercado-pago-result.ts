export type MercadoPagoCallbackResult = "success" | "cancelled";

export function parseMercadoPagoCallbackResult(
  value: string | string[] | null | undefined,
): MercadoPagoCallbackResult | null {
  if (Array.isArray(value) || (value !== "success" && value !== "cancelled")) {
    return null;
  }

  return value;
}
