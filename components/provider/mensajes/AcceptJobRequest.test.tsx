import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatHeader from "@/app/components/messaging/ChatHeader";
import MessageBubble from "@/app/components/messaging/MessageBubble";
import MessagesList from "@/app/components/messaging/MessagesList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

describe("08-VMP: Aceptar solicitud - ChatHeader con botón aceptar", () => {
  it("no muestra botón aceptar cuando la conversación no está pendiente", () => {
    render(
      <ChatHeader
        providerName="Maria"
        providerSurname="Fernandez"
        pending={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Aceptar Solicitud" })).not.toBeInTheDocument();
  });

  it("muestra botón aceptar cuando la conversación está pendiente", () => {
    const onAccept = vi.fn();
    render(
      <ChatHeader
        providerName="Maria"
        providerSurname="Fernandez"
        pending={true}
        onAccept={onAccept}
      />
    );

    const button = screen.getByRole("button", { name: "Aceptar Solicitud" });
    expect(button).toBeInTheDocument();
  });

  it("llama a onAccept cuando se hace clic en el botón", () => {
    const onAccept = vi.fn();
    render(
      <ChatHeader
        providerName="Maria"
        providerSurname="Fernandez"
        pending={true}
        onAccept={onAccept}
      />
    );

    const button = screen.getByRole("button", { name: "Aceptar Solicitud" });
    fireEvent.click(button);

    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});

describe("MessageBubble styling", () => {
  it("renderiza mensaje propio con fondo oscuro a la derecha", () => {
    render(
      <MessageBubble
        id="1"
        content="Mi mensaje"
        sentAt="10:30"
        isExpanded={false}
        showExpandButton={false}
        onToggleExpand={vi.fn()}
        isOwnMessage={true}
      />
    );

    const bubble = screen.getByText("Mi mensaje").closest("div");
    expect(bubble).toHaveClass("bg-brand-primary");
    expect(bubble).toHaveClass("text-white");
  });

  it("renderiza mensaje de otro con fondo claro a la izquierda", () => {
    render(
      <MessageBubble
        id="1"
        content="Mensaje de otro"
        sentAt="10:30"
        isExpanded={false}
        showExpandButton={false}
        onToggleExpand={vi.fn()}
        isOwnMessage={false}
      />
    );

    const bubble = screen.getByText("Mensaje de otro").closest("div");
    expect(bubble).toHaveClass("bg-white");
    expect(bubble).toHaveClass("text-brand-primary");
    expect(bubble).toHaveClass("border-slate-200");
  });
});

describe("MessagesList - integración de mensajes", () => {
  const mockMessages = [
    { id: "1", content: "Hola", sentAt: "10:30", senderId: "provider-001" },
    { id: "2", content: "Buenos días", sentAt: "10:31", senderId: "consumer-10" },
    { id: "3", content: "Necesito ayuda", sentAt: "10:32", senderId: "provider-001" },
  ];

  it("renderiza mensajes con estilos correctos según remitente", () => {
    render(
      <MessagesList
        messages={mockMessages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
      />
    );

    const bubbles = screen.getAllByTestId(/^message-bubble|consumer-name|last-message/).filter(
      el => el.className.includes("rounded-2xl")
    );
    expect(bubbles.length).toBeGreaterThan(0);
  });

  it("muestra banner pendiente cuando showPendingBanner es true", () => {
    render(
      <MessagesList
        messages={[]}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={true}
      />
    );

    expect(screen.getByText(/Solicitud de contacto enviada/)).toBeInTheDocument();
  });
});