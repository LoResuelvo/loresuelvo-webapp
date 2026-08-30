import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProviderMessagesView from "@/components/provider/messages/ProviderMessagesView";

describe("ProviderMessagesView", () => {
  it("renders sidebar and chat slots in inactive chat state", () => {
    render(
      <ProviderMessagesView
        isChatActive={false}
        sidebar={<div data-testid="sidebar-slot">Sidebar</div>}
        chat={<div data-testid="chat-slot">Chat</div>}
      />
    );

    expect(screen.getByTestId("sidebar-slot")).toBeInTheDocument();
    expect(screen.getByTestId("chat-slot")).toBeInTheDocument();
  });

  it("renders with active chat layout classes", () => {
    const { container } = render(
      <ProviderMessagesView
        isChatActive={true}
        sidebar={<div data-testid="sidebar-slot">Sidebar</div>}
        chat={<div data-testid="chat-slot">Chat</div>}
      />
    );

    const chatContainer = container.querySelector(".flex-1.flex-col");
    expect(chatContainer).toHaveClass("flex");
  });

  it("applies custom className", () => {
    render(
      <ProviderMessagesView
        className="custom-provider-view"
        isChatActive={false}
        sidebar={<div>Sidebar</div>}
        chat={<div>Chat</div>}
      />
    );

    expect(screen.getByRole("main")).toHaveClass("custom-provider-view");
  });
});
