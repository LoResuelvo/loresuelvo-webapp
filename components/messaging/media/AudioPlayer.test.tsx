import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AudioPlayer, formatAudioTime } from "./AudioPlayer";

describe("AudioPlayer", () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("formats audio duration in mm:ss format", () => {
    expect(formatAudioTime(0)).toBe("0:00");
    expect(formatAudioTime(5)).toBe("0:05");
    expect(formatAudioTime(65)).toBe("1:05");
    expect(formatAudioTime(300)).toBe("5:00");
    expect(formatAudioTime(-1)).toBe("0:00");
  });

  it("renders play button and toggles playback on click", async () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.webm"
        originalName="nota-voz.webm"
        durationSeconds={12}
      />
    );

    const playBtn = screen.getByRole("button", { name: "Reproducir audio nota-voz.webm" });
    expect(playBtn).toBeInTheDocument();
    expect(screen.getByText("0:12")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("updates duration and calls onDurationLoaded when metadata is loaded", () => {
    const onDurationLoaded = vi.fn();
    render(
      <AudioPlayer
        src="https://example.com/audio.webm"
        originalName="nota-voz.webm"
        onDurationLoaded={onDurationLoaded}
      />
    );

    const audioEl = screen.getByLabelText("Reproductor de audio nota-voz.webm") as HTMLAudioElement;
    Object.defineProperty(audioEl, "duration", { configurable: true, value: 45 });
    fireEvent.loadedMetadata(audioEl);

    expect(onDurationLoaded).toHaveBeenCalledWith(45);
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });

  it("allows seeking using range input", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.webm"
        originalName="nota-voz.webm"
        durationSeconds={60}
      />
    );

    const slider = screen.getByLabelText("Control de reproducción") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "30" } });

    expect(screen.getByText("0:30")).toBeInTheDocument();
  });
});
