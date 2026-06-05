import { User } from "lucide-react";

interface ContactItemProps {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  isSelected: boolean;
  unreadCount?: number;
  onClick: (providerId: string) => void;
}

export default function ContactItem({
  providerId,
  providerName,
  providerSurname,
  lastMessage,
  lastMessageAt,
  pending,
  isSelected,
  unreadCount = 0,
  onClick,
}: ContactItemProps) {
  const hasUnread = unreadCount > 0;
  return (
    <div
      role="listitem"
      data-testid="contact-item"
      onClick={() => onClick(providerId)}
      className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
        isSelected ? "bg-brand-secondary/10" : ""
      }`}
      data-status={pending ? "pending" : "accepted"}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <User className="w-6 h-6 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            data-field="consumer-name"
            data-testid="consumer-name"
            className={`text-[14px] text-brand-primary truncate ${
              hasUnread ? "font-bold" : "font-semibold"
            }`}
          >
            {providerName + " " + providerSurname}
          </p>
          <p data-field="last-message-at" data-testid="last-message-at" className="text-[11px] text-slate-400">{lastMessageAt}</p>
        </div>
        <p
          data-field="last-message"
          data-testid="last-message"
          className={`text-[12px] truncate ${
            hasUnread ? "text-brand-primary font-medium" : "text-slate-500"
          }`}
        >
          {lastMessage}
        </p>
      </div>
      {hasUnread && (
        <span
          data-testid="unread-badge"
          className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold bg-red-500 text-white rounded-full"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      {!hasUnread && pending && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
          Pendiente
        </span>
      )}
    </div>
  );
}