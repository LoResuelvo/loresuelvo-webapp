import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "components/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "domain/**/*.test.{ts,tsx}",
      "application/**/*.test.{ts,tsx}",
      "infrastructure/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}"
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});