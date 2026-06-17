import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
            // Note: data-field is used exclusively for Cucumber E2E tests
            data-field="consumer-name"
            data-testid="consumer-name"
            className="font-semibold text-[14px] text-brand-primary truncate"
          >
            {providerName + " " + providerSurname}
          </p>
          <p data-field="last-message-at" data-testid="last-message-at" className="text-[11px] text-slate-400">{lastMessageAt}</p>
        </div>
        <p
          data-field="last-message"
          data-testid="last-message"
          className="text-[12px] text-slate-500 truncate"
        >
          {lastMessage}
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