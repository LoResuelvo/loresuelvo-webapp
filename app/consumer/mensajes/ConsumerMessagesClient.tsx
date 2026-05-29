"use client";

import { useSearchParams } from "next/navigation";
import { MessageSquare, User } from "lucide-react";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import { AuthSession } from "@/lib/auth/types";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
}

interface ConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  messages?: Message[];
}

interface ConsumerMessagesClientProps {
  session: AuthSession | null;
  contacts?: ConversationContact[];
}

export default function ConsumerMessagesClient({ session, contacts = [] }: ConsumerMessagesClientProps) {
  const searchParams = useSearchParams();
  const selectedProviderId = searchParams.get("provider_id");

  const selectedContact = contacts.find(c => c.providerId === selectedProviderId);

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 flex">
          <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-80px)]">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-[18px] font-bold text-brand-primary">Mensajes</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-500">No tienes conversaciones aún</p>
                  <p className="text-slate-400 text-sm mt-2">Inicia un chat con un prestador desde la búsqueda</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
                      selectedProviderId === contact.providerId ? "bg-brand-secondary/10" : ""
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[14px] text-brand-primary truncate">
                          {contact.providerName} {contact.providerSurname}
                        </p>
                        <p className="text-[11px] text-slate-400">{contact.lastMessageAt}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate">{contact.lastMessage}</p>
                    </div>
                    {contact.pending && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
                        Pendiente
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-brand-neutral/30">
            {selectedContact ? (
              <>
                <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-primary">
                      {selectedContact.providerName} {selectedContact.providerSurname}
                    </p>
                    {selectedContact.pending && (
                      <p className="text-[11px] text-amber-600">Esperando aceptación</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="flex flex-col gap-4">
                    {selectedContact.pending && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                        <p className="text-amber-700 text-sm">
                          Tu mensaje fue enviado. El prestador aún no aceptó la conversación.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <div className="bg-brand-primary text-white rounded-2xl rounded-tr-sm p-4 max-w-md">
                        <p className="text-[14px]">
                          {selectedContact.lastMessage}
                        </p>
                        <p className="text-[11px] text-white/70 mt-2">{selectedContact.lastMessageAt}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400">Selecciona un contacto para ver la conversación</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}