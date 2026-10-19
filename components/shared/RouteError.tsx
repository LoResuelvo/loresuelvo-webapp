"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface RouteErrorProps {
  onRetry: () => void;
}

export default function RouteError({ onRetry }: RouteErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <section
        aria-labelledby="route-error-title"
        className="w-full max-w-lg text-center"
      >
        <h1 id="route-error-title" className="text-2xl font-semibold text-foreground">
          {t.errors.route.title}
        </h1>
        <p className="mt-3 text-muted-foreground" role="alert">
          {t.errors.route.description}
        </p>
        <Button className="mt-6" onClick={onRetry} type="button" variant="brand">
          {t.errors.route.retry}
        </Button>
      </section>
    </main>
  );
}
