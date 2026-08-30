import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { AudioRecordingControls } from "./AudioRecordingControls";
import { AttachedFilesList } from "./AttachedFilesList";
import { MessageTextInput } from "./MessageTextInput";
import { t } from "@/infrastructure/i18n/translations";

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

describe("MessageInput Subcomponents", () => {
  describe("AudioRecordingControls", () => {
    it("renders timer and triggers actions", () => {
      const onCancel = vi.fn();
      const onPause = vi.fn();
      const onResume = vi.fn();
      const onStop = vi.fn();

      const { rerender } = render(
        <AudioRecordingControls
          isPaused={false}
          elapsedSeconds={12}
          onCancel={onCancel}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
        />
      );

      expect(screen.getByText("0:12")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: t.messaging.audioRecorder.cancelLabel }));
      expect(onCancel).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: t.messaging.audioRecorder.pauseLabel }));
      expect(onPause).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: t.messaging.audioRecorder.stopLabel }));
      expect(onStop).toHaveBeenCalledTimes(1);

      rerender(
        <AudioRecordingControls
          isPaused={true}
          elapsedSeconds={15}
          onCancel={onCancel}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: t.messaging.audioRecorder.resumeLabel }));
      expect(onResume).toHaveBeenCalledTimes(1);
    });
  });

  describe("AttachedFilesList", () => {
    it("renders nothing when file list is empty", () => {
      const { container } = render(
        <AttachedFilesList files={[]} onPreview={vi.fn()} onRemove={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders file preview and triggers callbacks", () => {
      const file = new File(["test"], "sample.png", { type: "image/png" });
      const onPreview = vi.fn();
      const onRemove = vi.fn();

      render(
        <AttachedFilesList
          files={[file]}
          onPreview={onPreview}
          onRemove={onRemove}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Ver vista previa de sample.png" }));
      expect(onPreview).toHaveBeenCalledWith(file, "blob:mock-url");

      fireEvent.click(screen.getByRole("button", { name: "Eliminar sample.png" }));
      expect(onRemove).toHaveBeenCalledWith(0);
    });
  });

  describe("MessageTextInput", () => {
    it("renders text input and triggers onChange and onSend on Enter", () => {
      const onChange = vi.fn();
      const onSend = vi.fn();

      render(
        <MessageTextInput
          value="Hola"
          onChange={onChange}
          onSend={onSend}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Hola mundo" } });
      expect(onChange).toHaveBeenCalledWith("Hola mundo");

      fireEvent.keyDown(input, { key: "Enter" });
      expect(onSend).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
      expect(onSend).toHaveBeenCalledTimes(1); // not called again
    });
  });
});
