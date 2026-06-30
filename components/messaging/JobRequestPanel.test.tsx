import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import JobRequestPanel from "./JobRequestPanel";

describe("JobRequestPanel", () => {
  const defaultJobRequest = {
    title: "Reparación de grifo",
    description: "Necesito reparar un grifo que pierde agua",
    providerName: "Carlos",
    providerSurname: "Méndez",
  };

  it("displays the provider's profile photo when providerProfilePhotoUrl is provided", () => {
    render(
      <JobRequestPanel
        jobRequest={{
          ...defaultJobRequest,
          providerProfilePhotoUrl: "https://example.com/photo.jpg",
        }}
        onClose={() => {}}
      />
    );

    const image = screen.getByRole("img", { name: /foto de carlos/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("displays provider initials when profile photo is not provided", () => {
    render(
      <JobRequestPanel
        jobRequest={defaultJobRequest}
        onClose={() => {}}
      />
    );

    const avatarText = screen.getByText("C");
    expect(avatarText).toBeInTheDocument();
  });

  it("displays the job request title and description", () => {
    render(
      <JobRequestPanel
        jobRequest={defaultJobRequest}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Reparación de grifo")).toBeInTheDocument();
    expect(screen.getByText("Necesito reparar un grifo que pierde agua")).toBeInTheDocument();
  });

  it("displays the provider's full name", () => {
    render(
      <JobRequestPanel
        jobRequest={defaultJobRequest}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Carlos Méndez")).toBeInTheDocument();
  });

  it("displays the modal with correct title", () => {
    render(
      <JobRequestPanel
        jobRequest={defaultJobRequest}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole("heading", { name: "Detalle de Solicitud" })).toBeInTheDocument();
  });

  it("displays attached images when present", () => {
    const images = [
      { id: "img-1", url: "http://example.com/img1.jpg", originalName: "leak.jpg" },
      { id: "img-2", url: "http://example.com/img2.jpg", originalName: "siphon.jpg" },
    ];

    render(
      <JobRequestPanel
        jobRequest={{
          ...defaultJobRequest,
          images,
        }}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Imágenes adjuntas")).toBeInTheDocument();
    expect(screen.getByAltText("leak.jpg")).toBeInTheDocument();
    expect(screen.getByAltText("siphon.jpg")).toBeInTheDocument();
  });

  it("does not display images section when no images are provided", () => {
    render(
      <JobRequestPanel
        jobRequest={{
          ...defaultJobRequest,
          images: [],
        }}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText("Imágenes adjuntas")).not.toBeInTheDocument();
  });

  it("limits the description to a scrollable area with a max height", () => {
    const longDescription = "línea ".repeat(50);
    render(
      <JobRequestPanel
        jobRequest={{
          ...defaultJobRequest,
          description: longDescription,
        }}
        onClose={() => {}}
      />
    );

    const descriptionContainer = screen.getByTestId("job-request-description");
    expect(descriptionContainer).toHaveClass("overflow-y-auto");
    expect(descriptionContainer.className).toMatch(/max-h-/);
  });
});

