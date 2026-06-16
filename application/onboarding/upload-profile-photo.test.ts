import { describe, expect, it, vi } from "vitest";
import { getPresignedUrl, confirmUpload } from "./upload-profile-photo";
import { FileRepository } from "@/ports/file-repository";
import { AuthService } from "@/ports/auth-service";

describe("upload-profile-photo", () => {
  const mockFileRepository = {
    getPresignedUrl: vi.fn(),
    confirmUpload: vi.fn(),
  } as unknown as FileRepository;

  const mockAuthService = {
    getSession: vi.fn(),
    updateSession: vi.fn(),
  } as unknown as AuthService;

  describe("getPresignedUrl", () => {
    it("throws an error if the user is unauthenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue(null);

      await expect(
        getPresignedUrl(mockFileRepository, mockAuthService, "photo.jpg", "image/jpeg", 1000, "profile_photo")
      ).rejects.toThrow("User is unauthenticated");
    });

    it("gets the presigned URL successfully if authenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue({
        user: { id: "1", email: "test@test.com", firstName: "A", lastName: "B" },
      });
      vi.mocked(mockFileRepository.getPresignedUrl).mockResolvedValue({
        file_id: "file-id",
        key: "key-123",
        upload_url: "http://upload.url",
        headers: {},
      });

      const res = await getPresignedUrl(mockFileRepository, mockAuthService, "photo.jpg", "image/jpeg", 1000, "profile_photo");
      expect(res.file_id).toBe("file-id");
      expect(res.upload_url).toBe("http://upload.url");
      expect(mockFileRepository.getPresignedUrl).toHaveBeenCalledWith("photo.jpg", "image/jpeg", 1000, "profile_photo");
    });
  });

  describe("confirmUpload", () => {
    it("throws an error if the user is unauthenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue(null);

      await expect(
        confirmUpload(mockFileRepository, mockAuthService, "file-id", "key", "image/jpeg", 1000)
      ).rejects.toThrow("User is unauthenticated");
    });

    it("confirms the upload successfully if authenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue({
        user: { id: "1", email: "test@test.com", firstName: "A", lastName: "B" },
      });
      vi.mocked(mockFileRepository.confirmUpload).mockResolvedValue({
        id: "file-id",
        url: "http://final.url/photo.jpg",
        original_name: "photo.jpg",
      });

      const res = await confirmUpload(mockFileRepository, mockAuthService, "file-id", "key", "image/jpeg", 1000);
      expect(res.url).toBe("http://final.url/photo.jpg");
      expect(mockFileRepository.confirmUpload).toHaveBeenCalledWith("file-id", "key", "image/jpeg", 1000);
    });
  });
});
