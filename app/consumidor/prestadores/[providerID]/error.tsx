"use client";

import ProviderProfileError from "@/components/consumer/provider-profile/ProviderProfileError";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return <ProviderProfileError error={error} reset={reset} />;
}
