import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkRequestCard from "./WorkRequestCard";
import { ProviderWorkRequest } from "@/domain/provider/types";

describe("WorkRequestCard", () => {
  const mockRequest: ProviderWorkRequest = {
    id: "7",
    conversationId: "10",
    clientName: "Aylen Suarez",
    problemTitle: "Perro rabioso",
    category: "Veterinaria",
    description: "Necesito atención para mi perro",
    location: "Palermo, CABA",
    publishedAtLabel: "Hace 20 min",
    unreadMessagesCount: 0,
  };

  const mockOnViewDetails = vi.fn();

  it("renders card details correctly", () => {
    render(
      <WorkRequestCard
        request={mockRequest}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText("Aylen Suarez")).toBeInTheDocument();
    expect(screen.getByText("Perro rabioso")).toBeInTheDocument();
    expect(screen.getByText("Necesito atención para mi perro")).toBeInTheDocument();
    expect(screen.getByText("Palermo, CABA")).toBeInTheDocument();
    expect(screen.getByText("Hace 20 min")).toBeInTheDocument();
    expect(screen.queryByTestId("images-indicator")).not.toBeInTheDocument();
  });

  it("renders image count indicator badge when images are present", () => {
    const requestWithImages: ProviderWorkRequest = {
      ...mockRequest,
      images: [
        { id: "img-1", url: "http://example.com/img1.jpg", originalName: "leak.jpg" },
      ],
    };

    render(
      <WorkRequestCard
        request={requestWithImages}
        onViewDetails={mockOnViewDetails}
      />
    );

    const badge = screen.getByTestId("images-indicator");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("1 Imagen");
  });

  it("calls onViewDetails when clicking view details button", () => {
    render(
      <WorkRequestCard
        request={mockRequest}
        onViewDetails={mockOnViewDetails}
      />
    );

    const viewButton = screen.getByRole("button", { name: "Ver Solicitud" });
    fireEvent.click(viewButton);

    expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
  });
});
