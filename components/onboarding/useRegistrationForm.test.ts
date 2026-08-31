import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadProfilePhoto } from "./useRegistrationForm";
import * as fileActions from "@/app/files/actions";
import { storageClient } from "@/infrastructure/storage/storage-client";

vi.mock("@/app/files/actions", () => ({
  prepareFileUploadAction: vi.fn(),
  confirmFileUploadAction: vi.fn(),
}));

vi.mock("@/infrastructure/storage/storage-client", () => ({
  storageClient: {
    uploadFile: vi.fn(),
  },
}));

describe("uploadProfilePhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if no profile photo is attached in formData", async () => {
    const formData = new FormData();
    await uploadProfilePhoto(formData);

    expect(fileActions.prepareFileUploadAction).not.toHaveBeenCalled();
  });

  it("uploads profile photo and updates formData fields", async () => {
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("profilePhoto", file);

    vi.mocked(fileActions.prepareFileUploadAction).mockResolvedValue({
      success: true,
      data: {
        uploadUrl: "https://upload.example.com",
        fileId: "fid-123",
        storageKey: "key-123",
        headers: {},
      },
    });

    vi.mocked(storageClient.uploadFile).mockResolvedValue(undefined);

    vi.mocked(fileActions.confirmFileUploadAction).mockResolvedValue({
      success: true,
      data: {
        fileId: "confirmed-id",
        url: "https://cdn.example.com/avatar.png",
        originalName: "avatar.png",
      },
    });

    await uploadProfilePhoto(formData);

    expect(fileActions.prepareFileUploadAction).toHaveBeenCalledWith({
      originalName: "avatar.png",
      mimeType: "image/png",
      sizeBytes: file.size,
      purpose: "profile_photo",
    });
    expect(storageClient.uploadFile).toHaveBeenCalledWith(
      file,
      "https://upload.example.com",
      {}
    );
    expect(fileActions.confirmFileUploadAction).toHaveBeenCalledWith({
      fileId: "fid-123",
      storageKey: "key-123",
      mimeType: "image/png",
      sizeBytes: file.size,
    });

    expect(formData.get("profilePhoto")).toBeNull();
    expect(formData.get("profilePhotoId")).toBe("confirmed-id");
    expect(formData.get("profilePhotoUrl")).toBe("https://cdn.example.com/avatar.png");
  });
});
