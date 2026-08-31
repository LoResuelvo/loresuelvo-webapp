import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadProfilePhoto } from "./useRegistrationForm";
import * as executeUploadModule from "@/application/files/execute-file-upload";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("uploadProfilePhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing if no profile photo is attached in formData", async () => {
    const formData = new FormData();
    await uploadProfilePhoto(formData);

    expect(executeUploadModule.executeFileUpload).not.toHaveBeenCalled();
  });

  it("uploads profile photo and updates formData fields", async () => {
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("profilePhoto", file);

    vi.mocked(executeUploadModule.executeFileUpload).mockResolvedValue({
      fileId: "confirmed-id",
      url: "https://cdn.example.com/avatar.png",
      originalName: "avatar.png",
    });

    await uploadProfilePhoto(formData);

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledWith(
      clientFileUploadRepository,
      {
        file,
        originalName: "avatar.png",
        mimeType: "image/png",
        purpose: "profile_photo",
      }
    );

    expect(formData.get("profilePhoto")).toBeNull();
    expect(formData.get("profilePhotoId")).toBe("confirmed-id");
    expect(formData.get("profilePhotoUrl")).toBe("https://cdn.example.com/avatar.png");
  });
});
