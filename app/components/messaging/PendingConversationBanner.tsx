interface PendingConversationBannerProps {
  isPending: boolean;
}

export default function PendingConversationBanner({ isPending }: PendingConversationBannerProps) {
  if (!isPending) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-blue-700 text-[14px]">
        Solicitud de contacto enviada. El prestador aún no aceptó la conversación.
      </p>
    </div>
  );
}
