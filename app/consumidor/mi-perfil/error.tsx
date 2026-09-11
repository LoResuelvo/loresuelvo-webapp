"use client";

import ProfileError from "@/components/profile/ProfileError";

interface ProfileErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileErrorBoundary({ reset }: ProfileErrorBoundaryProps) {
  return <ProfileError reset={reset} />;
}
