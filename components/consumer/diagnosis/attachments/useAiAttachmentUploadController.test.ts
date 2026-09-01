import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiAttachmentUploadController } from "./useAiAttachmentUploadController";
import * as executeUploadModule from "@/application/files/execute-file-upload";
import type { UploadingAiImageAttachment } from "./ai-image-attachment";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("useAiAttachmentUploadController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createAttachment = (name: string): UploadingAiImageAttachment => ({
    id: `id-${name}`,
    file: new File(["content"], name, { type: "image/jpeg" }),
    previewUrl: `blob:${name}`,
    status: "uploading",
  });

  it("uploads attachment and marks it uploaded without clearing previous errors prematurely", async () => {
    const markAttachmentUploaded = vi.fn();
    const markAttachmentFailed = vi.fn();
    const markAttachmentUploading = vi.fn();
    const isAttachmentActive = vi.fn().mockReturnValue(true);

    vi.mocked(executeUploadModule.executeFileUpload).mockResolvedValueOnce({
      fileId: "confirmed-1",
      url: "https://url-1",
      originalName: "1.jpg",
    });

    const { result } = renderHook(() =>
      useAiAttachmentUploadController({
        isAttachmentActive,
        markAttachmentUploading,
        markAttachmentUploaded,
        markAttachmentFailed,
      })
    );

    const att = createAttachment("1.jpg");
    await act(async () => {
      await result.current.uploadAttachment(att);
    });

    expect(markAttachmentUploaded).toHaveBeenCalledWith(att, {
      fileId: "confirmed-1",
      url: "https://url-1",
      originalName: "1.jpg",
    });
    expect(result.current.fileUploadError).toBeNull();
  });

  it("marks attachment failed and sets fileUploadError on server error", async () => {
    const markAttachmentUploaded = vi.fn();
    const markAttachmentFailed = vi.fn();
    const markAttachmentUploading = vi.fn();
    const isAttachmentActive = vi.fn().mockReturnValue(true);

    vi.mocked(executeUploadModule.executeFileUpload).mockRejectedValueOnce(
      new Error("Upload failed")
    );

    const { result } = renderHook(() =>
      useAiAttachmentUploadController({
        isAttachmentActive,
        markAttachmentUploading,
        markAttachmentUploaded,
        markAttachmentFailed,
      })
    );

    const att = createAttachment("1.jpg");
    await act(async () => {
      await result.current.uploadAttachment(att);
    });

    expect(markAttachmentFailed).toHaveBeenCalledWith(att, "No se pudo cargar la imagen");
    expect(result.current.fileUploadError).toBe("No se pudo cargar la imagen");
  });

  it("clears fileUploadError only when no failed attachments remain upon removal", () => {
    const { result } = renderHook(() =>
      useAiAttachmentUploadController({
        isAttachmentActive: () => true,
        markAttachmentUploading: vi.fn(),
        markAttachmentUploaded: vi.fn(),
        markAttachmentFailed: vi.fn(),
      })
    );

    act(() => {
      result.current.handleAttachmentRemoved([]);
    });

    expect(result.current.fileUploadError).toBeNull();
  });
});
