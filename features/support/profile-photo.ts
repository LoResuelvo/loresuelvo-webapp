import type { Page } from "playwright";

const PROFILE_PHOTO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#60a5fa"/></svg>';

export async function stubProfilePhoto(page: Page, photoUrl: string): Promise<void> {
  await page.route(photoUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: PROFILE_PHOTO_SVG,
    }),
  );
}
