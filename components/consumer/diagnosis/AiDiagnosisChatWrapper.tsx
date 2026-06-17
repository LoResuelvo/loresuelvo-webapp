"use client";

import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import { createApiAssistantClient } from "@/infrastructure/repositories/api-assistant-client";

interface AiDiagnosisChatWrapperProps {
  accessToken?: string;
}

export default function AiDiagnosisChatWrapper({ accessToken }: AiDiagnosisChatWrapperProps) {
  const assistantClient = createApiAssistantClient(accessToken);

  return <AiDiagnosisChat client={assistantClient} />;
}
