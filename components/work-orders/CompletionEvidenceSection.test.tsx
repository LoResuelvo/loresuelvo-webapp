import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompletionEvidenceSection } from "./CompletionEvidenceSection";
import type { CompletionReportDetail } from "@/domain/work-order/types";

describe("CompletionEvidenceSection", () => {
  const mockReport: CompletionReportDetail = {
    id: 1,
    description: "Trabajo finalizado correctamente y verificado.",
    reportedOn: "2026-08-20T12:00:00Z",
    images: [
      {
        fileId: "file-01",
        originalName: "evidencia_1.jpg",
        url: "https://placehold.co/600x400/png?text=Evidencia+1",
      },
      {
        fileId: "file-02",
        originalName: "evidencia_2.jpg",
        url: "https://placehold.co/600x400/png?text=Evidencia+2",
      },
    ],
  };

  it("should render evidence header, delivery description, and images", () => {
    render(<CompletionEvidenceSection report={mockReport} />);

    expect(screen.getByTestId("completion-evidence-section")).toBeInTheDocument();
    expect(screen.getByText("Evidencia de finalización")).toBeInTheDocument();
    expect(
      screen.getByText("Trabajo finalizado correctamente y verificado.")
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "evidencia_1.jpg" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "evidencia_2.jpg" })).toBeInTheDocument();
  });

  it("should open lightbox modal when clicking an image thumbnail", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();

    render(<CompletionEvidenceSection report={mockReport} />);

    const thumbnailBtn = screen.getByRole("button", { name: "evidencia_1.jpg" });
    await user.click(thumbnailBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
