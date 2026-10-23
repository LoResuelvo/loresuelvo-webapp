import path from "node:path";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const isCI = Boolean(process.env.CI);
const coverageRoot = path.resolve(__dirname).replace(/\\/g, "/");

// These modules contain text dictionaries only. Keep claims/diagnosis formatters.
const translationDictionaries = [
  "consumer", "errors", "file-upload", "landing", "messaging", "navigation",
  "notifications", "onboarding", "payments", "profile", "provider-activity",
  "provider-collections", "provider-conversion", "provider-home",
  "provider-reputation", "service-proposals", "work-orders",
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: [
        `${coverageRoot}/{app,components,hooks,lib,domain,ports,application,infrastructure}/**/*.{ts,tsx}`,
        `${coverageRoot}/middleware.ts`,
      ],
      excludeAfterRemap: true,
      exclude: [
        "**/*.{test,spec}.{ts,tsx}",
        "**/*.d.ts",
        "features/**",
        "tools/**",
        `${coverageRoot}/infrastructure/i18n/translations.ts`,
        ...translationDictionaries.map(
          (name) => `${coverageRoot}/infrastructure/i18n/translations/${name}.ts`,
        ),
        `${coverageRoot}/infrastructure/api/e2e-stubs-utils.ts`,
        `${coverageRoot}/infrastructure/auth/{mock,dev}-adapter.ts`,
        `${coverageRoot}/infrastructure/maps/mock-map-adapter.ts`,
        `${coverageRoot}/infrastructure/repositories/provider/mock-provider-home-repository.ts`,
      ],
    },
    maxWorkers: isCI ? undefined : "25%",
    browser: {
      provider: playwright(),
      instances: [
        { browser: "chromium" },
      ],
    },
    include: [
      "components/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "domain/**/*.test.{ts,tsx}",
      "application/**/*.test.{ts,tsx}",
      "infrastructure/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
      "hooks/**/*.test.{ts,tsx}"
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
