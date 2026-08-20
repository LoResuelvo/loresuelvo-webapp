import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload";
import * as fileActions from "@/app/files/actions";
import { storageClient } from "@/infrastructure/storage/storage-client";

vi.mock("@/app/files/actions", () => ({
  getPresignedUrlAction: vi.fn(),
  confirmUploadAction: vi.fn(),
}));

vi.mock("@/infrastructure/storage/storage-client", () => ({
  storageClient: {
    uploadFile: vi.fn(),
  },
}));

describe("useFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a single file successfully through the 3-step pipeline", async () => {
    vi.mocked(fileActions.getPresignedUrlAction).mockResolvedValue({
      file_id: "file-123",
      key: "work_order_completion_image/file-123",
      upload_url: "https://s3.aws.com/upload/file-123",
      headers: { "x-amz-acl": "public-read" },
    });

    vi.mocked(storageClient.uploadFile).mockResolvedValue();

    vi.mocked(fileActions.confirmUploadAction).mockResolvedValue({
      id: "file-123",
      url: "https://storage.loresuelvo.test/file-123.jpg",
      original_name: "evidencia.jpg",
    });

    const { result } = renderHook(() => useFileUpload());

    const file = new File(["dummy-content"], "evidencia.jpg", { type: "image/jpeg" });

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file, {
        purpose: "work_order_completion_image",
      });
    });

    expect(fileActions.getPresignedUrlAction).toHaveBeenCalledWith(
      "evidencia.jpg",
      "image/jpeg",
      file.size,
      "work_order_completion_image"
    );

    expect(storageClient.uploadFile).toHaveBeenCalledWith(
      file,
      "https://s3.aws.com/upload/file-123",
      { "x-amz-acl": "public-read" }
    );

    expect(fileActions.confirmUploadAction).toHaveBeenCalledWith(
      "file-123",
      "work_order_completion_image/file-123",
      "image/jpeg",
      file.size
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
    vi.mocked(fileActions.getPresignedUrlAction)
      .mockResolvedValueOnce({
        file_id: "file-1",
        key: "work_order_completion_image/file-1",
        upload_url: "https://s3.aws.com/upload/file-1",
        headers: {},
      })
      .mockResolvedValueOnce({
        file_id: "file-2",
        key: "work_order_completion_image/file-2",
        upload_url: "https://s3.aws.com/upload/file-2",
        headers: {},
      });

    vi.mocked(storageClient.uploadFile).mockResolvedValue();

    vi.mocked(fileActions.confirmUploadAction)
      .mockResolvedValueOnce({
        id: "file-1",
        url: "https://storage.loresuelvo.test/file-1.jpg",
        original_name: "foto1.jpg",
      })
      .mockResolvedValueOnce({
        id: "file-2",
        url: "https://storage.loresuelvo.test/file-2.jpg",
        original_name: "foto2.jpg",
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

  it("sets error and rethrows when presigned URL action fails", async () => {
    vi.mocked(fileActions.getPresignedUrlAction).mockRejectedValue(new Error("Presign failed"));

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
    vi.mocked(fileActions.getPresignedUrlAction).mockRejectedValue(new Error("Upload failed"));

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
