"use client";

import { useState } from "react";
import type { ProviderReputation } from "@/domain/provider/reputation";
import { ReputationIndicators } from "./ReputationIndicators";
import { ReputationReviewsList } from "./ReputationReviewsList";

export type ReputationActionResult =
  | { success: true; data: ProviderReputation }
  | { success: false; error: string };

export function ReputationClient({
  initialResult,
}: {
  initialResult: ReputationActionResult;
}) {
  const [result] = useState(initialResult);

  if (!result.success) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {result.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReputationIndicators data={result.data} />
      <ReputationReviewsList reviews={result.data.reviews} />
    </div>
  );
}
