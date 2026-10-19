"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";

import RouteError from "@/components/shared/RouteError";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ reset }: ErrorProps) {
  const router = useRouter();

  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return <RouteError onRetry={retry} />;
}
