import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload";
import * as executeUploadModule from "@/application/files/execute-file-upload";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("useFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a single file successfully through executeFileUpload", async () => {
    vi.mocked(executeUploadModule.executeFileUpload).mockResolvedValue({
      fileId: "file-123",
      url: "https://storage.loresuelvo.test/file-123.jpg",
      originalName: "evidencia.jpg",
    });

    const { result } = renderHook(() => useFileUpload());

    const file = new File(["dummy-content"], "evidencia.jpg", { type: "image/jpeg" });

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file, {
        purpose: "work_order_completion_image",
      });
    });

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledWith(
      clientFileUploadRepository,
      {
        file,
        originalName: "evidencia.jpg",
        mimeType: "image/jpeg",
        purpose: "work_order_completion_image",
      }
    );

    expect(uploadResult).toEqual({
      fileId: "file-123",
      url: "https://storage.loresuelvo.test/file-123.jpg",
      originalName: "evidencia.jpg",
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles multiple files upload with uploadMultipleFiles", async () => {
    vi.mocked(executeUploadModule.executeFileUpload)
      .mockResolvedValueOnce({
        fileId: "file-1",
        url: "https://storage.loresuelvo.test/file-1.jpg",
        originalName: "foto1.jpg",
      })
      .mockResolvedValueOnce({
        fileId: "file-2",
        url: "https://storage.loresuelvo.test/file-2.jpg",
        originalName: "foto2.jpg",
      });

    const { result } = renderHook(() => useFileUpload());

    const file1 = new File(["dummy1"], "foto1.jpg", { type: "image/jpeg" });
    const file2 = new File(["dummy2"], "foto2.jpg", { type: "image/jpeg" });

    let results: any;
    await act(async () => {
      results = await result.current.uploadMultipleFiles([file1, file2], {
        purpose: "work_order_completion_image",
      });
    });

    expect(results).toHaveLength(2);
    expect(results?.[0].fileId).toBe("file-1");
    expect(results?.[1].fileId).toBe("file-2");
    expect(result.current.isUploading).toBe(false);
  });

  it("sets error and rethrows when executeFileUpload fails", async () => {
    vi.mocked(executeUploadModule.executeFileUpload).mockRejectedValue(new Error("Presign failed"));

    const { result } = renderHook(() => useFileUpload());
    const file = new File(["dummy"], "error.jpg", { type: "image/jpeg" });

    await act(async () => {
      await expect(
        result.current.uploadFile(file, { purpose: "work_order_completion_image" })
      ).rejects.toThrow("Presign failed");
    });

    expect(result.current.error).toBe("Presign failed");
    expect(result.current.isUploading).toBe(false);
  });

  it("allows clearing the error via resetError", async () => {
    vi.mocked(executeUploadModule.executeFileUpload).mockRejectedValue(new Error("Upload failed"));

    const { result } = renderHook(() => useFileUpload());
    const file = new File(["dummy"], "error.jpg", { type: "image/jpeg" });

    await act(async () => {
      try {
        await result.current.uploadFile(file, { purpose: "work_order_completion_image" });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Upload failed");

    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
  });
});
