import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VideoPreview, formatVideoDuration } from "./VideoPreview";

describe("VideoPreview", () => {
  describe("formatVideoDuration", () => {
    it("formats seconds into m:ss correctly", () => {
      expect(formatVideoDuration(0)).toBe("0:00");
      expect(formatVideoDuration(17)).toBe("0:17");
      expect(formatVideoDuration(65)).toBe("1:05");
      expect(formatVideoDuration(120)).toBe("2:00");
      expect(formatVideoDuration(-1)).toBe("0:00");
      expect(formatVideoDuration(NaN)).toBe("0:00");
    });
  });

  it("renders filename, duration and remove button", () => {
    const onRemove = vi.fn();
    render(
      <VideoPreview
        videoUrl="blob:video"
        fileName="perdida.mp4"
        durationSeconds={17}
        onRemove={onRemove}
      />
    );

    expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    expect(screen.getByText("perdida.mp4")).toBeInTheDocument();
    expect(screen.getByText("0:17")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reproducir video" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar video de la vista previa" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("toggles play/pause when the play button is clicked", async () => {
    render(
      <VideoPreview
        videoUrl="blob:video"
        fileName="perdida.mp4"
        durationSeconds={17}
        onRemove={vi.fn()}
      />
    );

    const video = screen.getByTestId("video-preview-player") as HTMLVideoElement;
    video.play = vi.fn().mockResolvedValue(undefined);
    video.pause = vi.fn();

    const playButton = screen.getByRole("button", { name: "Reproducir video" });
    fireEvent.click(playButton);

    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("notifies onDurationLoaded when metadata is loaded", () => {
    const onDurationLoaded = vi.fn();
    render(
      <VideoPreview
        videoUrl="blob:video"
        fileName="perdida.mp4"
        onRemove={vi.fn()}
        onDurationLoaded={onDurationLoaded}
      />
    );

    const video = screen.getByTestId("video-preview-player") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 45 });
    fireEvent.loadedMetadata(video);

    expect(onDurationLoaded).toHaveBeenCalledWith(45);
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });
});
