import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioPreview } from "./AudioPreview";

describe("AudioPreview", () => {
  it("renders an accessible player, duration and remove control", () => {
    const onRemove = vi.fn();
    render(
      <AudioPreview
        audioUrl="blob:audio"
        fileName="ruido-bomba.webm"
        onRemove={onRemove}
      />
    );

    const player = screen.getByLabelText("Reproductor de audio ruido-bomba.webm") as HTMLAudioElement;
    Object.defineProperty(player, "duration", { configurable: true, value: 18 });
    fireEvent.loadedMetadata(player);

    expect(player).toHaveAttribute("controls");
    expect(screen.getByTestId("audio-duration")).toHaveTextContent("0:18");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar audio adjunto ruido-bomba.webm" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
