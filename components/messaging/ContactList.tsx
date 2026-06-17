import ContactItem from "./ContactItem";
import { t } from "@/infrastructure/i18n/translations";

import { ConversationContact } from "@/domain/messaging/types";

interface ContactListProps {
  contacts: ConversationContact[];
  selectedProviderId: string | null;
  onContactClick: (providerId: string) => void;
}

export default function ContactList({ contacts, selectedProviderId, onContactClick }: ContactListProps) {
  return (
    <div className="flex flex-col h-full" role="region" aria-label={t.messaging.title}>
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-[18px] font-bold text-brand-primary">{t.messaging.title}</h2>
      </div>
      <div
        role="list"
        aria-label="Lista de conversaciones"
        className="flex-1 overflow-y-auto"
      >
        {contacts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">{t.messaging.emptyConversations}</p>
          </div>
        ) : (
          <>
            {contacts.map((contact) => (
              <ContactItem
                key={contact.id}
                id={contact.id}
                providerId={contact.providerId}
                providerName={contact.providerName}
                providerSurname={contact.providerSurname}
                lastMessage={contact.lastMessage}
                lastMessageAt={contact.lastMessageAt}
                pending={contact.pending}
                isSelected={selectedProviderId === contact.providerId}
                onClick={onContactClick}
                profilePhotoUrl={contact.profilePhotoUrl}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}