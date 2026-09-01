import { describe, expect, it, vi } from "vitest";
import { uploadSequentialAttachments } from "./upload-sequential-attachments";
import type { InitialDiagnosisAttachment } from "./initial-diagnosis-attachment";
import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";

describe("uploadSequentialAttachments", () => {
  const createFile = (name: string): InitialDiagnosisAttachment => ({
    id: `id-${name}`,
    file: new File(["content"], name, { type: "image/jpeg" }),
    previewUrl: `blob:${name}`,
    status: "selected",
  });

  it("uploads files strictly one by one (maximum 1 in flight) using controlled promises", async () => {
    let inFlightCount = 0;
    let maxInFlight = 0;
    const resolvers: Array<(confirmed: ConfirmedFileUpload) => void> = [];

    const uploadFile = vi.fn((_att: InitialDiagnosisAttachment) => {
      inFlightCount += 1;
      if (inFlightCount > maxInFlight) maxInFlight = inFlightCount;
      return new Promise<ConfirmedFileUpload>((resolve) => {
        resolvers.push((confirmed) => {
          inFlightCount -= 1;
          resolve(confirmed);
        });
      });
    });

    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    const items = [createFile("1.jpg"), createFile("2.jpg")];
    const promise = uploadSequentialAttachments(items, {
      uploadFile,
      onStart,
      onSuccess,
      onFailure,
      isCancelled: () => false,
      isItemActive: () => true,
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(maxInFlight).toBe(1);

    // Resolve first upload
    resolvers[0]({ fileId: "id-1", url: "https://1", originalName: "1.jpg" });
    await Promise.resolve();

    // Now second upload should have started
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);

    // Resolve second upload
    resolvers[1]({ fileId: "id-2", url: "https://2", originalName: "2.jpg" });
    const result = await promise;

    expect(result).toEqual({ status: "completed", imageIds: ["id-1", "id-2"] });
    expect(maxInFlight).toBe(1);
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("stops immediately on failure: 3 files, failure on 2nd, 3rd never starts", async () => {
    const uploadFile = vi
      .fn()
      .mockResolvedValueOnce({ fileId: "id-1", url: "https://1", originalName: "1.jpg" })
      .mockRejectedValueOnce(new Error("Upload of 2.jpg failed"))
      .mockResolvedValueOnce({ fileId: "id-3", url: "https://3", originalName: "3.jpg" });

    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    const items = [createFile("1.jpg"), createFile("2.jpg"), createFile("3.jpg")];

    await expect(
      uploadSequentialAttachments(items, {
        uploadFile,
        onStart,
        onSuccess,
        onFailure,
        isCancelled: () => false,
        isItemActive: () => true,
      })
    ).rejects.toThrow("Upload of 2.jpg failed");

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith("id-1.jpg", {
      fileId: "id-1",
      url: "https://1",
      originalName: "1.jpg",
    });
    expect(onFailure).toHaveBeenCalledWith("id-2.jpg", "Upload of 2.jpg failed");
    expect(onStart).not.toHaveBeenCalledWith("id-3.jpg");
  });

  it("handles cancellation / unmount during 1st upload: returns cancelled and does not run 2nd upload", async () => {
    let cancelled = false;
    const resolvers: Array<(confirmed: ConfirmedFileUpload) => void> = [];

    const uploadFile = vi.fn((_att: InitialDiagnosisAttachment) => {
      return new Promise<ConfirmedFileUpload>((resolve) => {
        resolvers.push((confirmed) => resolve(confirmed));
      });
    });

    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    const items = [createFile("1.jpg"), createFile("2.jpg")];
    const promise = uploadSequentialAttachments(items, {
      uploadFile,
      onStart,
      onSuccess,
      onFailure,
      isCancelled: () => cancelled,
      isItemActive: () => !cancelled,
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);

    // Cancel before resolving first upload
    cancelled = true;
    resolvers[0]({ fileId: "id-1", url: "https://1", originalName: "1.jpg" });

    const result = await promise;

    expect(result).toEqual({ status: "cancelled" });
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("reuses already uploaded file on retry without duplicate network call", async () => {
    const uploadFile = vi.fn().mockResolvedValueOnce({
      fileId: "id-2",
      url: "https://2",
      originalName: "2.jpg",
    });

    const alreadyUploaded: InitialDiagnosisAttachment = {
      id: "id-1.jpg",
      file: new File(["content"], "1.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:1.jpg",
      status: "uploaded",
      uploaded: { fileId: "id-1", url: "https://1", originalName: "1.jpg" },
    };
    const failedItem = createFile("2.jpg");

    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    const result = await uploadSequentialAttachments([alreadyUploaded, failedItem], {
      uploadFile,
      onStart,
      onSuccess,
      onFailure,
      isCancelled: () => false,
      isItemActive: () => true,
    });

    expect(result).toEqual({ status: "completed", imageIds: ["id-1", "id-2"] });
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(uploadFile).toHaveBeenCalledWith(failedItem);
  });
});
