import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompletionEvidenceSection, CompletionEvidenceData } from "./CompletionEvidenceSection";

describe("CompletionEvidenceSection", () => {
  const mockReport: CompletionEvidenceData = {
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
});
