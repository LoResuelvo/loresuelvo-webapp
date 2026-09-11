export interface CalendarAuthorization {
  authorizationUrl: string;
  state: string;
}

export function isSafeCalendarAuthorizationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isGoogleHost =
      url.hostname === "accounts.google.com" || url.hostname.endsWith(".google.com");
    return url.protocol === "https:" && isGoogleHost;
  } catch {
    return false;
  }
}
