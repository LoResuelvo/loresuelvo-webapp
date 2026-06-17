import ContactList from "./ContactList";
import { ConversationContact } from "@/domain/messaging/types";
interface MessagesLayoutProps {
  contacts: ConversationContact[];
  selectedProviderId: string | null;
  onContactClick: (providerId: string) => void;
}

export default function MessagesLayout({
  contacts,
  selectedProviderId,
  onContactClick,
}: MessagesLayoutProps) {
  return (
    <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-full">
      <ContactList
        contacts={contacts}
        selectedProviderId={selectedProviderId}
        onContactClick={onContactClick}
      />
    </div>
  );
}

