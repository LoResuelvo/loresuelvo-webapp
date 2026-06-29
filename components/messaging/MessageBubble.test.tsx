import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MessageBubble from "./MessageBubble";
import { t } from "@/infrastructure/i18n/translations";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />
}));

describe("MessageBubble", () => {
  it("renders the message content", () => {
    render(
      <MessageBubble
        id="msg-1"
        content="Hola mundo"
        sentAt="10:00"
        isExpanded={false}
        showExpandButton={false}
        onToggleExpand={vi.fn()}
      />
    );
    expect(screen.getByText("Hola mundo")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("renders attached images and opens preview modal on click", () => {
    const images = [
      { id: "img-1", url: "https://example.com/img1.jpg", originalName: "foto1.jpg" }
    ];

    render(
      <MessageBubble
        id="msg-2"
        sentAt="10:00"
        isExpanded={false}
        showExpandButton={false}
        onToggleExpand={vi.fn()}
        images={images}
      />
    );

    // Verify image thumbnail is rendered
    const imgElement = screen.getByAltText(`${t.messaging.attachedImage} foto1.jpg`);
    expect(imgElement).toBeInTheDocument();

    // Verify modal is not initially visible (using a query for the modal role or specific text)
    expect(screen.queryByLabelText("Cerrar vista previa")).not.toBeInTheDocument();

    // Click on the image thumbnail button
    const imageButton = imgElement.closest("button");
    if (imageButton) {
      fireEvent.click(imageButton);
    }

    // Modal should now be open
    const closeBtn = screen.getByLabelText("Cerrar vista previa");
    expect(closeBtn).toBeInTheDocument();

    // Verify the preview image is shown in the modal
    const previewImages = screen.getAllByAltText(`${t.messaging.attachedImage} foto1.jpg`);
    expect(previewImages.length).toBeGreaterThan(1); // Thumbnail + Modal

    // Close the modal
    fireEvent.click(closeBtn);
    expect(screen.queryByLabelText("Cerrar vista previa")).not.toBeInTheDocument();
  });
});
