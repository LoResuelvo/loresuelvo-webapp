import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, Video } from "lucide-react";
import { isAudioPreview, isVideoPreview } from "@/lib/messaging/message-preview";

interface ContactItemProps {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  isSelected: boolean;
  onClick: (providerId: string) => void;
  profilePhotoUrl?: string;
}

function MessagePreviewIcon({ message }: { message: string }) {
  if (isAudioPreview(message)) {
    return <Mic className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />;
  }
  if (isVideoPreview(message)) {
    return <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" data-testid="video-icon" aria-hidden="true" />;
  }
  return null;
}

export default function ContactItem({
  providerId,
  providerName,
  providerSurname,
  lastMessage,
  lastMessageAt,
  pending,
  isSelected,
  onClick,
  profilePhotoUrl,
}: ContactItemProps) {
  return (
    <div role="listitem">
      <button
        type="button"
        data-testid="contact-item"
        data-status={pending ? "pending" : "accepted"}
        onClick={() => onClick(providerId)}
        aria-current={isSelected ? "true" : undefined}
        className={`chat-list-item flex w-full min-w-0 items-center gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${
          isSelected ? "bg-brand-secondary/10" : ""
        }`}
      >
        <Avatar
          src={profilePhotoUrl}
          alt={`${t.messaging.photoAlt} ${providerName}`}
          size="md"
          imgTestId="chat-list-profile-photo"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p
              data-field="consumer-name"
              data-testid="consumer-name"
              className="min-w-0 flex-1 truncate font-semibold text-body text-brand-primary"
            >
              {providerName + " " + providerSurname}
            </p>
            <p
              data-field="last-message-at"
              data-testid="last-message-at"
              className="shrink-0 whitespace-nowrap text-caption text-slate-400"
            >
              {lastMessageAt}
            </p>
          </div>
          <p
            data-field="last-message"
            data-testid="last-message"
            className="flex min-w-0 items-center gap-1.5 truncate text-small text-slate-500"
          >
            <MessagePreviewIcon message={lastMessage} />
            <span className="min-w-0 truncate">{lastMessage}</span>
          </p>
        </div>
        {pending && (
          <Badge variant="warning" className="shrink-0 whitespace-nowrap">
            {t.messaging.pending}
          </Badge>
        )}
      </button>
    </div>
  );
}
