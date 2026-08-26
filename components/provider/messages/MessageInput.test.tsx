import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import MessageInput, { MessageInputHandle } from "@/components/messaging/MessageInput";
import { t } from "@/infrastructure/i18n/translations";

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

describe("MessageInput", () => {
  it("calls onSend when Enter is pressed", () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        value="Hola mundo"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does not call onSend when Shift+Enter is pressed", () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        value="Hola mundo"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("focuses input when focus method is called", () => {
    const ref = { current: null as MessageInputHandle | null };
    const { getByRole } = render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        ref={(el: MessageInputHandle) => { ref.current = el; }}
      />
    );

    ref.current?.focus();
    expect(document.activeElement).toBe(getByRole("textbox"));
  });
  it("shows an error when attaching an invalid file type", () => {
    const onAttachFiles = vi.fn();
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={onAttachFiles}
      />
    );

    const file = new File(["dummy content"], "dummy.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onAttachFiles).not.toHaveBeenCalled();
    expect(screen.getByText(t.messaging.photoInvalidFormat)).toBeInTheDocument();
  });

  it("calls onAttachFiles when a valid file is provided", () => {
    const onAttachFiles = vi.fn();
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={onAttachFiles}
      />
    );

    const file = new File(["image dummy"], "dummy.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onAttachFiles).toHaveBeenCalledTimes(1);
    expect(onAttachFiles).toHaveBeenCalledWith([file]);
  });

  it("shows an accessible audio preview after selecting audio", () => {
    render(
      <MessageInput
        value="Texto previo"
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    const audio = new File(["audio"], "ruido-bomba.webm", { type: "audio/webm" });
    fireEvent.change(audioInput, { target: { files: [audio] } });

    expect(screen.getByTestId("audio-preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Reproductor de audio ruido-bomba.webm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar audio adjunto ruido-bomba.webm" })).toBeInTheDocument();

    const player = screen.getByLabelText("Reproductor de audio ruido-bomba.webm") as HTMLAudioElement;
    Object.defineProperty(player, "duration", { configurable: true, value: 18 });
    fireEvent.loadedMetadata(player);
    expect(screen.getByTestId("audio-duration")).toHaveTextContent("0:18");
  });

  it("rejects audio with a MIME type outside WebM/Opus", () => {
    const onChange = vi.fn();
    render(
      <MessageInput
        value=""
        onChange={onChange}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: { files: [new File(["audio"], "grabacion.m4a", { type: "audio/mp4" })] },
    });

    expect(screen.getByText(t.messaging.audioAttachment.invalidFormat)).toBeInTheDocument();
    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects audio larger than 5 MiB", () => {
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: {
        files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "audio-grande.webm", { type: "audio/webm" })],
      },
    });

    expect(screen.getByText(t.messaging.audioAttachment.tooLarge)).toBeInTheDocument();
    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();
  });

  it("rejects metadata longer than 300 seconds and clears the preview", () => {
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: { files: [new File(["audio"], "audio-largo.webm", { type: "audio/webm" })] },
    });

    const player = screen.getByLabelText("Reproductor de audio audio-largo.webm") as HTMLAudioElement;
    Object.defineProperty(player, "duration", { configurable: true, value: 301 });
    fireEvent.loadedMetadata(player);

    expect(screen.getByText(t.messaging.audioAttachment.durationTooLong)).toBeInTheDocument();
    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();
  });

  it("accepts metadata at exactly 300 seconds", () => {
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: { files: [new File(["audio"], "audio-300.webm", { type: "audio/webm" })] },
    });

    const player = screen.getByLabelText("Reproductor de audio audio-300.webm") as HTMLAudioElement;
    Object.defineProperty(player, "duration", { configurable: true, value: 300 });
    fireEvent.loadedMetadata(player);

    expect(screen.getByText(t.messaging.audioAttachment.durationAccepted)).toBeInTheDocument();
    expect(screen.getByTestId("audio-preview")).toBeInTheDocument();
  });

  it("clears text and image attachments and disables their controls while audio is selected", () => {
    const onChange = vi.fn();
    const onRemoveFile = vi.fn();
    const image = new File(["image"], "foto.jpg", { type: "image/jpeg" });
    render(
      <MessageInput
        value="Texto previo"
        onChange={onChange}
        onSend={vi.fn()}
        disabled={false}
        attachedFiles={[image]}
        onAttachFiles={vi.fn()}
        onRemoveFile={onRemoveFile}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: { files: [new File(["audio"], "ruido-bomba.webm", { type: "audio/webm" })] },
    });

    expect(onChange).toHaveBeenCalledWith("");
    expect(onRemoveFile).toHaveBeenCalledWith(0);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir menú de acciones" })).toBeDisabled();
  });

  it("removes audio and revokes its object URL when cancelled", () => {
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: { files: [new File(["audio"], "ruido-bomba.webm", { type: "audio/webm" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar audio adjunto ruido-bomba.webm" }));

    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("reports unsupported recording without creating a preview", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Grabar audio" }));

    await waitFor(() => {
      expect(screen.getByText(t.messaging.audioRecorder.errors.unsupported)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("audio-recording")).not.toBeInTheDocument();
    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("reports denied microphone permission without creating a preview", async () => {
    class SupportedMediaRecorder {
      static isTypeSupported = () => true;
    }
    const previousMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    vi.stubGlobal("MediaRecorder", SupportedMediaRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) },
    });

    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Grabar audio" }));

    await waitFor(() => {
      expect(screen.getByText(t.messaging.audioRecorder.errors.permissionDenied)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("audio-recording")).not.toBeInTheDocument();
    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();

    if (previousMediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", previousMediaDevices);
    } else {
      Reflect.deleteProperty(navigator, "mediaDevices");
    }
    vi.unstubAllGlobals();
  });

  it("keeps the audio preview and shows the upload error so it can be retried", async () => {
    const onSendAudio = vi.fn().mockResolvedValue("PUT");
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        onSendAudio={onSendAudio}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Adjuntar audio" }));
    const audioInput = document.querySelector('input[accept="audio/webm"]') as HTMLInputElement;
    fireEvent.change(audioInput, {
      target: { files: [new File(["audio"], "ruido-bomba.webm", { type: "audio/webm" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: t.messaging.sendLabel }));

    await waitFor(() => {
      expect(screen.getByText(t.messaging.audioUpload.errors.PUT)).toBeInTheDocument();
    });
    expect(screen.getByTestId("audio-preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.messaging.sendLabel })).toBeEnabled();
  });

  it("records audio, previews it, and sends it via onSendAudio", async () => {
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      static instances: FakeMediaRecorder[] = [];
      state: RecordingState = "inactive";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      readonly mimeType: string = "audio/webm;codecs=opus";

      constructor() {
        FakeMediaRecorder.instances.push(this);
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["recorded voice"], { type: "audio/webm" }) } as BlobEvent);
        this.onstop?.();
      }
    }

    const previousMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    const onSendAudio = vi.fn().mockResolvedValue(true);
    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        onSendAudio={onSendAudio}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Grabar audio" }));

    await waitFor(() => {
      expect(screen.getByTestId("audio-recording")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: t.messaging.audioRecorder.stopLabel }));

    await waitFor(() => {
      expect(screen.getByTestId("audio-preview")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: t.messaging.sendLabel }));

    await waitFor(() => {
      expect(onSendAudio).toHaveBeenCalledTimes(1);
    });
    expect(onSendAudio.mock.calls[0][0]).toBeInstanceOf(File);
    expect(onSendAudio.mock.calls[0][0].name).toBe("audio.webm");

    if (previousMediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", previousMediaDevices);
    } else {
      Reflect.deleteProperty(navigator, "mediaDevices");
    }
    vi.unstubAllGlobals();
  });

  it("cancels recorded audio preview when remove button is clicked", async () => {
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      state: RecordingState = "inactive";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      readonly mimeType: string = "audio/webm;codecs=opus";

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["recorded voice"], { type: "audio/webm" }) } as BlobEvent);
        this.onstop?.();
      }
    }

    const previousMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        onSendAudio={vi.fn()}
        disabled={false}
        onAttachFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Grabar audio" }));

    await waitFor(() => {
      expect(screen.getByTestId("audio-recording")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: t.messaging.audioRecorder.stopLabel }));

    await waitFor(() => {
      expect(screen.getByTestId("audio-preview")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: `Eliminar audio adjunto ${t.messaging.audioRecorder.recordedFileName}` }));

    expect(screen.queryByTestId("audio-preview")).not.toBeInTheDocument();

    if (previousMediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", previousMediaDevices);
    } else {
      Reflect.deleteProperty(navigator, "mediaDevices");
    }
    vi.unstubAllGlobals();
  });
});
