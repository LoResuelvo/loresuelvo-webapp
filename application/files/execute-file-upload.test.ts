import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  executeFileUpload,
  FileUploadError,
  ExecuteFileUploadCommand,
} from "./execute-file-upload";
import { FileUploadRepository } from "@/ports/files/file-upload-repository";

describe("executeFileUpload", () => {
  let mockRepository: FileUploadRepository;
  const dummyFile = new Blob(["hello world content"], { type: "image/png" });
  const command: ExecuteFileUploadCommand = {
    file: dummyFile,
    originalName: "test.png",
    mimeType: "image/png",
    purpose: "conversation_message_image",
  };

  beforeEach(() => {
    mockRepository = {
      prepareUpload: vi.fn().mockResolvedValue({
        fileId: "fid-123",
        storageKey: "key-123",
        uploadUrl: "https://upload.example.com/file",
        headers: { "x-amz-acl": "public-read" },
      }),
      upload: vi.fn().mockResolvedValue(undefined),
      confirmUpload: vi.fn().mockResolvedValue({
        fileId: "fid-123",
        url: "https://storage.loresuelvo.com/test.png",
        originalName: "test.png",
      }),
    };
  });

  it("executes the pipeline in exact order: prepare -> transfer -> confirm", async () => {
    const result = await executeFileUpload(mockRepository, command);

    expect(mockRepository.prepareUpload).toHaveBeenCalledWith({
      originalName: "test.png",
      mimeType: "image/png",
      sizeBytes: dummyFile.size,
      purpose: "conversation_message_image",
    });

    expect(mockRepository.upload).toHaveBeenCalledWith({
      uploadUrl: "https://upload.example.com/file",
      file: dummyFile,
      headers: { "x-amz-acl": "public-read" },
    });

    expect(mockRepository.confirmUpload).toHaveBeenCalledWith({
      fileId: "fid-123",
      storageKey: "key-123",
      mimeType: "image/png",
      sizeBytes: dummyFile.size,
    });

    expect(result).toEqual({
      fileId: "fid-123",
      url: "https://storage.loresuelvo.com/test.png",
      originalName: "test.png",
    });
  });

  it("wraps prepareUpload failure in FileUploadError(stage=prepare) and does not call upload or confirmUpload", async () => {
    const originalError = new Error("Presign endpoint failed");
    vi.mocked(mockRepository.prepareUpload).mockRejectedValue(originalError);

    const promise = executeFileUpload(mockRepository, command);

    await expect(promise).rejects.toThrow(FileUploadError);
    await expect(promise).rejects.toThrow("Presign endpoint failed");

    try {
      await executeFileUpload(mockRepository, command);
    } catch (err) {
      expect(err).toBeInstanceOf(FileUploadError);
      const fileErr = err as FileUploadError;
      expect(fileErr.stage).toBe("prepare");
      expect(fileErr.cause).toBe(originalError);
    }

    expect(mockRepository.upload).not.toHaveBeenCalled();
    expect(mockRepository.confirmUpload).not.toHaveBeenCalled();
  });

  it("wraps upload failure in FileUploadError(stage=transfer) and does not call confirmUpload", async () => {
    const originalError = new Error("S3 PUT failed");
    vi.mocked(mockRepository.upload).mockRejectedValue(originalError);

    const promise = executeFileUpload(mockRepository, command);

    await expect(promise).rejects.toThrow(FileUploadError);
    await expect(promise).rejects.toThrow("S3 PUT failed");

    try {
      await executeFileUpload(mockRepository, command);
    } catch (err) {
      expect(err).toBeInstanceOf(FileUploadError);
      const fileErr = err as FileUploadError;
      expect(fileErr.stage).toBe("transfer");
      expect(fileErr.cause).toBe(originalError);
    }

    expect(mockRepository.confirmUpload).not.toHaveBeenCalled();
  });

  it("wraps confirmUpload failure in FileUploadError(stage=confirm)", async () => {
    const originalError = new Error("Confirm endpoint failed");
    vi.mocked(mockRepository.confirmUpload).mockRejectedValue(originalError);

    const promise = executeFileUpload(mockRepository, command);

    await expect(promise).rejects.toThrow(FileUploadError);
    await expect(promise).rejects.toThrow("Confirm endpoint failed");

    try {
      await executeFileUpload(mockRepository, command);
    } catch (err) {
      expect(err).toBeInstanceOf(FileUploadError);
      const fileErr = err as FileUploadError;
      expect(fileErr.stage).toBe("confirm");
      expect(fileErr.cause).toBe(originalError);
    }
  });
});
