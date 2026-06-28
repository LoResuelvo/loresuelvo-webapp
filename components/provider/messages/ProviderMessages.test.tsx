import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactList from "@/components/messaging/ContactList";
import ContactItem from "@/components/messaging/ContactItem";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

const mockContacts = [
  {
    id: "conv-1",
    providerId: "10",
    providerName: "Maria",
    providerSurname: "Fernandez",
    lastMessage: "Hola, me gustaria contratarte para el trabajo",
    lastMessageAt: "01/06 14:30",
    pending: false,
  },
  {
    id: "conv-2",
    providerId: "11",
    providerName: "Javier",
    providerSurname: "Torres",
    lastMessage: "Necesito reparar una fuga de agua",
    lastMessageAt: "01/06 13:30",
    pending: true,
  },
];

describe("01-VMP & 02-VMP: Visualizar lista de conversaciones", () => {
  it("ContactList renders with proper list structure", () => {
    render(
      <ContactList
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    const list = screen.getByRole("list", { name: "Lista de conversaciones" });
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(2);
  });

  it("ContactList shows section header with 'Mensajes' label", () => {
    render(
      <ContactList
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    const section = screen.getByRole("region", { name: "Mensajes" });
    expect(section).toBeInTheDocument();
  });

  it("renders multiple contact items", () => {
    render(
      <ContactList
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(2);
  });

  it("shows empty state when no contacts", () => {
    render(
      <ContactList
        contacts={[]}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    expect(screen.getByText("No tienes conversaciones aún")).toBeInTheDocument();
  });
});

describe("03-VMP: Cada conversación muestra el nombre del consumidor", () => {
  it("ContactItem renders consumer name with data-field='consumer-name'", () => {
    const contact = mockContacts[0];
    render(
      <ContactItem
        id={contact.id}
        providerId={contact.providerId}
        providerName={contact.providerName}
        providerSurname={contact.providerSurname}
        lastMessage={contact.lastMessage}
        lastMessageAt={contact.lastMessageAt}
        pending={contact.pending}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    const nameElement = screen.getByTestId("consumer-name");
    expect(nameElement).toBeInTheDocument();
    expect(nameElement).toHaveTextContent("Maria Fernandez");
  });

  it("ContactItem renders last message with data-field='last-message'", () => {
    const contact = mockContacts[0];
    render(
      <ContactItem
        id={contact.id}
        providerId={contact.providerId}
        providerName={contact.providerName}
        providerSurname={contact.providerSurname}
        lastMessage={contact.lastMessage}
        lastMessageAt={contact.lastMessageAt}
        pending={contact.pending}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    const lastMessage = screen.getByTestId("last-message");
    expect(lastMessage).toBeInTheDocument();
    expect(lastMessage).toHaveTextContent("Hola, me gustaria contratarte para el trabajo");
  });

  it("ContactItem renders last message timestamp with data-field='last-message-at'", () => {
    const contact = mockContacts[0];
    render(
      <ContactItem
        id={contact.id}
        providerId={contact.providerId}
        providerName={contact.providerName}
        providerSurname={contact.providerSurname}
        lastMessage={contact.lastMessage}
        lastMessageAt={contact.lastMessageAt}
        pending={contact.pending}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    const lastMessageAt = screen.getByTestId("last-message-at");
    expect(lastMessageAt).toBeInTheDocument();
    expect(lastMessageAt).toHaveTextContent("01/06 14:30");
  });

  it("ContactItem shows pending badge for pending conversations", () => {
    const pendingContact = mockContacts[1];
    render(
      <ContactItem
        id={pendingContact.id}
        providerId={pendingContact.providerId}
        providerName={pendingContact.providerName}
        providerSurname={pendingContact.providerSurname}
        lastMessage={pendingContact.lastMessage}
        lastMessageAt={pendingContact.lastMessageAt}
        pending={pendingContact.pending}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Javier Torres")).toBeInTheDocument();
  });

  it("ContactItem has correct data-status attribute", () => {
    const pendingContact = mockContacts[1];
    const acceptedContact = mockContacts[0];

    const { rerender } = render(
      <ContactItem
        id={pendingContact.id}
        providerId={pendingContact.providerId}
        providerName={pendingContact.providerName}
        providerSurname={pendingContact.providerSurname}
        lastMessage={pendingContact.lastMessage}
        lastMessageAt={pendingContact.lastMessageAt}
        pending={pendingContact.pending}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("contact-item")).toHaveAttribute("data-status", "pending");

    rerender(
      <ContactItem
        id={acceptedContact.id}
        providerId={acceptedContact.providerId}
        providerName={acceptedContact.providerName}
        providerSurname={acceptedContact.providerSurname}
        lastMessage={acceptedContact.lastMessage}
        lastMessageAt={acceptedContact.lastMessageAt}
        pending={acceptedContact.pending}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("contact-item")).toHaveAttribute("data-status", "accepted");
  });
});