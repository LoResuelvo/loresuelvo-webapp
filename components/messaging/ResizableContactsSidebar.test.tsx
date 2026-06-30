import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResizableContactsSidebar from "@/components/messaging/ResizableContactsSidebar";
import type { ConversationContact } from "@/domain/messaging/types";

vi.mock("@/components/messaging/ContactList", () => ({
  default: vi.fn(({ contacts, selectedProviderId, onContactClick }: {
    contacts: ConversationContact[];
    selectedProviderId: string | null;
    onContactClick: (id: string) => void;
  }) => (
    <div data-testid="contact-list">
      {contacts.map((c) => (
        <button
          key={c.id}
          onClick={() => onContactClick(c.providerId)}
          data-selected={String(c.providerId) === String(selectedProviderId)}
        >
          {c.providerName}
        </button>
      ))}
    </div>
  )),
}));

const mockContacts = [
  { id: "conv-1", providerId: "p1", providerName: "Juan", providerSurname: "Gómez", lastMessage: "Hola", lastMessageAt: "10:00", pending: false },
  { id: "conv-2", providerId: "p2", providerName: "Ana", providerSurname: "Pérez", lastMessage: "Chau", lastMessageAt: "11:00", pending: false },
];

function dragSeparator(toX: number) {
  const separator = screen.getByRole("separator", { name: /redimensionar lista/i });
  act(() => {
    fireEvent.mouseDown(separator, { clientX: 320 });
    fireEvent.mouseMove(document, { clientX: toX });
    fireEvent.mouseUp(document);
  });
}

describe("ResizableContactsSidebar", () => {
  it("renders the ContactList with the contacts", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("contact-list")).toBeInTheDocument();
    expect(screen.getByText("Juan")).toBeInTheDocument();
  });

  it("renders a vertical separator with accessible name 'Redimensionar lista'", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );
    const separator = screen.getByRole("separator", { name: /redimensionar lista/i });
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
  });

  it("starts with default width of 320px", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("resizable-contacts-sidebar")).toHaveStyle({ width: "320px" });
  });

  it("increases width when the separator is dragged to the right", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    dragSeparator(420);

    expect(screen.getByTestId("resizable-contacts-sidebar")).toHaveStyle({ width: "420px" });
  });

  it("decreases width when the separator is dragged to the left", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    dragSeparator(250);

    expect(screen.getByTestId("resizable-contacts-sidebar")).toHaveStyle({ width: "250px" });
  });

  it("clamps width to the minimum of 220px when dragged below", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    dragSeparator(0);

    expect(screen.getByTestId("resizable-contacts-sidebar")).toHaveStyle({ width: "220px" });
  });

  it("clamps width to the maximum of 500px when dragged above", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    dragSeparator(9999);

    expect(screen.getByTestId("resizable-contacts-sidebar")).toHaveStyle({ width: "500px" });
  });

  it("keeps ContactList visible after a resize (does not unmount it)", () => {
    const onContactClick = vi.fn();
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={onContactClick}
      />
    );

    dragSeparator(400);
    const juan = screen.getByText("Juan");
    expect(juan).toBeInTheDocument();
    juan.click();
    expect(onContactClick).toHaveBeenCalledWith("p1");
  });

  it("updates aria-valuenow when resized", () => {
    render(
      <ResizableContactsSidebar
        contacts={mockContacts}
        selectedProviderId={null}
        onContactClick={vi.fn()}
      />
    );

    dragSeparator(380);

    const separator = screen.getByRole("separator", { name: /redimensionar lista/i });
    expect(separator).toHaveAttribute("aria-valuenow", "380");
  });
});