export interface AiDiagnosisRouteParams {
  selectedId: string | null;
  isNewChat: boolean;
  isPending: boolean;
  isChatActive: boolean;
}

export function parseAiDiagnosisParams(
  searchParams: { get: (key: string) => string | null } | null | undefined
): AiDiagnosisRouteParams {
  const selectedId = searchParams?.get("id") ?? null;
  const isNewChat = searchParams?.get("new") === "true";
  const isPending = searchParams?.get("pending") === "1";
  const isChatActive = Boolean(selectedId) || isNewChat || isPending;

  return {
    selectedId,
    isNewChat,
    isPending,
    isChatActive,
  };
}
