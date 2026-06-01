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
  onClick,
}: ContactItemProps) {
  return (
    <div
      onClick={() => onClick(providerId)}
      className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
        isSelected ? "bg-brand-secondary/10" : ""
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <User className="w-6 h-6 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[14px] text-brand-primary truncate">
            {providerName} {providerSurname}
          </p>
          <p className="text-[11px] text-slate-400">{lastMessageAt}</p>
        </div>
        <p className="text-[12px] text-slate-500 truncate">{lastMessage}</p>
      </div>
      {pending && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
          Pendiente
        </span>
      )}
    </div>
  );
}