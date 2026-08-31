import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiChatInputArea } from "./AiChatInputArea";
import { t } from "@/infrastructure/i18n/translations";
import type { AiImageAttachment } from "./attachments/ai-image-attachment";

describe("AiChatInputArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn();
  });

  it("renders input placeholder, attach button, and send button", () => {
    render(
      <AiChatInputArea
        composer={{
          value: "",
          onChange: vi.fn(),
          onSend: vi.fn(),
        }}
        files={{
          attachments: [],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
      />
    );

    expect(screen.getByPlaceholderText(t.messaging.inputPlaceholder)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.aiDiagnosis.attachImages })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.messaging.sendLabel })).toBeDisabled();
  });

  it("calls onChange when typing into textarea", () => {
    const handleChange = vi.fn();
    render(
      <AiChatInputArea
        composer={{
          value: "",
          onChange: handleChange,
          onSend: vi.fn(),
        }}
        files={{
          attachments: [],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
      />
    );

    const textarea = screen.getByPlaceholderText(t.messaging.inputPlaceholder);
    fireEvent.change(textarea, { target: { value: "Mensaje de prueba" } });

    expect(handleChange).toHaveBeenCalledWith("Mensaje de prueba");
  });

  it("enables send button and calls onSend on click or Enter key", () => {
    const handleSend = vi.fn();
    render(
      <AiChatInputArea
        composer={{
          value: "Hola",
          onChange: vi.fn(),
          onSend: handleSend,
        }}
        files={{
          attachments: [],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
      />
    );

    const sendButton = screen.getByRole("button", { name: t.messaging.sendLabel });
    expect(sendButton).not.toBeDisabled();

    fireEvent.click(sendButton);
    expect(handleSend).toHaveBeenCalledTimes(1);

    const textarea = screen.getByPlaceholderText(t.messaging.inputPlaceholder);
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(handleSend).toHaveBeenCalledTimes(2);
  });

  it("renders attached files thumbnails and calls onRemove and onPreview", () => {
    const handleRemove = vi.fn();
    const handlePreview = vi.fn();
    const file = new File(["test"], "foto.jpg", { type: "image/jpeg" });
    const attachment: AiImageAttachment = {
      id: "att-123",
      file,
      previewUrl: "blob:mock/foto.jpg",
      status: "uploaded",
      uploaded: {
        fileId: "file-123",
        url: "https://storage.test/foto.jpg",
        originalName: "foto.jpg",
      },
    };

    render(
      <AiChatInputArea
        composer={{
          value: "",
          onChange: vi.fn(),
          onSend: vi.fn(),
        }}
        files={{
          attachments: [attachment],
          onFileChange: vi.fn(),
          onRemove: handleRemove,
          onPreview: handlePreview,
        }}
      />
    );

    expect(screen.getByAltText("Vista previa de foto.jpg")).toBeInTheDocument();

    const previewButton = screen.getByAltText("Vista previa de foto.jpg").closest("button");
    if (previewButton) {
      fireEvent.click(previewButton);
      expect(handlePreview).toHaveBeenCalledWith({
        url: "blob:mock/foto.jpg",
        name: "foto.jpg",
      });
    }

    const removeButton = screen.getByRole("button", { name: "Eliminar foto.jpg" });
    fireEvent.click(removeButton);
    expect(handleRemove).toHaveBeenCalledWith("att-123");
  });

  it("does not create object URLs while rendering or rerendering previews", () => {
    const file = new File(["test"], "foto.jpg", { type: "image/jpeg" });
    const attachment: AiImageAttachment = {
      id: "att-123",
      file,
      previewUrl: "blob:managed/foto.jpg",
      status: "uploading",
    };
    const props = {
      composer: { value: "", onChange: vi.fn(), onSend: vi.fn() },
      files: {
        attachments: [attachment],
        onFileChange: vi.fn(),
        onRemove: vi.fn(),
        onPreview: vi.fn(),
      },
    };

    const { rerender } = render(<AiChatInputArea {...props} />);
    rerender(<AiChatInputArea {...props} />);

    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("disables send button when an attachment is uploading", () => {
    const handleSend = vi.fn();
    const file = new File(["test"], "foto.jpg", { type: "image/jpeg" });
    const attachment: AiImageAttachment = {
      id: "att-123",
      file,
      previewUrl: "blob:mock/foto.jpg",
      status: "uploading",
    };

    render(
      <AiChatInputArea
        composer={{
          value: "Texto listo",
          onChange: vi.fn(),
          onSend: handleSend,
        }}
        files={{
          attachments: [attachment],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
      />
    );

    const sendButton = screen.getByRole("button", { name: t.messaging.sendLabel });
    expect(sendButton).toBeDisabled();
    expect(screen.getByLabelText("Cargando imagen")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText(t.messaging.inputPlaceholder), {
      key: "Enter",
      shiftKey: false,
    });
    expect(handleSend).not.toHaveBeenCalled();
  });

  it("disables send button when an attachment has failed", () => {
    const handleSend = vi.fn();
    const file = new File(["test"], "foto.jpg", { type: "image/jpeg" });
    const attachment: AiImageAttachment = {
      id: "att-123",
      file,
      previewUrl: "blob:mock/foto.jpg",
      status: "failed",
      error: "No se pudo cargar",
    };

    render(
      <AiChatInputArea
        composer={{
          value: "Texto listo",
          onChange: vi.fn(),
          onSend: handleSend,
        }}
        files={{
          attachments: [attachment],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
      />
    );

    const sendButton = screen.getByRole("button", { name: t.messaging.sendLabel });
    expect(sendButton).toBeDisabled();
    expect(screen.getByLabelText("Error al cargar imagen")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText(t.messaging.inputPlaceholder), {
      key: "Enter",
      shiftKey: false,
    });
    expect(handleSend).not.toHaveBeenCalled();
  });

  it("keeps Shift+Enter as a line break without sending", () => {
    const handleSend = vi.fn();
    render(
      <AiChatInputArea
        composer={{ value: "Texto listo", onChange: vi.fn(), onSend: handleSend }}
        files={{
          attachments: [],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
      />
    );

    fireEvent.keyDown(screen.getByPlaceholderText(t.messaging.inputPlaceholder), {
      key: "Enter",
      shiftKey: true,
    });
    expect(handleSend).not.toHaveBeenCalled();
  });

  it("displays uploadError when present", () => {
    render(
      <AiChatInputArea
        composer={{
          value: "",
          onChange: vi.fn(),
          onSend: vi.fn(),
        }}
        files={{
          attachments: [],
          onFileChange: vi.fn(),
          onRemove: vi.fn(),
          onPreview: vi.fn(),
        }}
        uploadError="Error al subir imagen"
      />
    );

    expect(screen.getByText("Error al subir imagen")).toBeInTheDocument();
  });
});
