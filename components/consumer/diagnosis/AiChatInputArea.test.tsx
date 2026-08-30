import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiChatInputArea } from "./AiChatInputArea";
import { t } from "@/infrastructure/i18n/translations";

global.URL.createObjectURL = vi.fn(() => "blob:https://loresuelvo.com/mock-blob");

describe("AiChatInputArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          attached: [],
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
          attached: [],
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
          attached: [],
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

    render(
      <AiChatInputArea
        composer={{
          value: "",
          onChange: vi.fn(),
          onSend: vi.fn(),
        }}
        files={{
          attached: [file],
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
      expect(handlePreview).toHaveBeenCalledTimes(1);
    }

    const removeButton = screen.getByRole("button", { name: "Eliminar foto.jpg" });
    fireEvent.click(removeButton);
    expect(handleRemove).toHaveBeenCalledWith(0);
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
          attached: [],
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
