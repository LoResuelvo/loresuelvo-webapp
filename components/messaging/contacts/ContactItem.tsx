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
    <div
      role="listitem"
      data-testid="contact-item"
      onClick={() => onClick(providerId)}
      className={`chat-list-item flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
        isSelected ? "bg-brand-secondary/10" : ""
      }`}
      data-status={pending ? "pending" : "accepted"}
    >
      <Avatar
        src={profilePhotoUrl}
        alt={`${t.messaging.photoAlt} ${providerName}`}
        size="md"
        imgTestId="chat-list-profile-photo"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            data-field="consumer-name"
            data-testid="consumer-name"
            className="font-semibold text-body text-brand-primary truncate"
          >
            {providerName + " " + providerSurname}
          </p>
          <p data-field="last-message-at" data-testid="last-message-at" className="text-caption text-slate-400">{lastMessageAt}</p>
        </div>
        <p
          data-field="last-message"
          data-testid="last-message"
          className="text-small text-slate-500 truncate flex items-center gap-1.5"
        >
          <MessagePreviewIcon message={lastMessage} />
          <span className="truncate">{lastMessage}</span>
        </p>
      </div>
      {pending && (
        <Badge variant="warning">
          {t.messaging.pending}
        </Badge>
      )}
    </div>
  );
}