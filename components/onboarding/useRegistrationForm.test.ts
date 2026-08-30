import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadProfilePhoto } from "./useRegistrationForm";
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

describe("uploadProfilePhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if no profile photo is attached in formData", async () => {
    const formData = new FormData();
    await uploadProfilePhoto(formData);

    expect(fileActions.getPresignedUrlAction).not.toHaveBeenCalled();
  });

  it("uploads profile photo and updates formData fields", async () => {
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("profilePhoto", file);

    vi.mocked(fileActions.getPresignedUrlAction).mockResolvedValue({
      success: true,
      data: {
        upload_url: "https://upload.example.com",
        file_id: "fid-123",
        key: "key-123",
        headers: {},
      },
    });

    vi.mocked(storageClient.uploadFile).mockResolvedValue(undefined);

    vi.mocked(fileActions.confirmUploadAction).mockResolvedValue({
      success: true,
      data: {
        id: "confirmed-id",
        url: "https://cdn.example.com/avatar.png",
        original_name: "avatar.png",
      },
    });

    await uploadProfilePhoto(formData);

    expect(fileActions.getPresignedUrlAction).toHaveBeenCalledWith(
      "avatar.png",
      "image/png",
      file.size,
      "profile_photo"
    );
    expect(storageClient.uploadFile).toHaveBeenCalledWith(
      file,
      "https://upload.example.com",
      {}
    );
    expect(fileActions.confirmUploadAction).toHaveBeenCalledWith(
      "fid-123",
      "key-123",
      "image/png",
      file.size
    );

    expect(formData.get("profilePhoto")).toBeNull();
    expect(formData.get("profilePhotoId")).toBe("confirmed-id");
    expect(formData.get("profilePhotoUrl")).toBe("https://cdn.example.com/avatar.png");
  });
});
