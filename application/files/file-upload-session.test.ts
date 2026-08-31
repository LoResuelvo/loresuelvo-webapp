import { describe, expect, it, vi } from "vitest";
import { prepareFileUpload, confirmFileUpload } from "./file-upload-session";
import {
  FileUploadSessionRepository,
  PrepareFileUploadCommand,
  ConfirmFileUploadCommand,
} from "@/ports/files/file-upload-repository";
import { AuthService } from "@/ports/onboarding/auth-service";

describe("file-upload-session", () => {
  const mockFileRepository: FileUploadSessionRepository = {
    prepareUpload: vi.fn(),
    confirmUpload: vi.fn(),
  };

  const mockAuthService: AuthService = {
    getSession: vi.fn(),
    updateSession: vi.fn(),
  };

  describe("prepareFileUpload", () => {
    const command: PrepareFileUploadCommand = {
      originalName: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1000,
      purpose: "profile_photo",
    };

    it("throws an error if the user is unauthenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue(null);

      await expect(
        prepareFileUpload(mockFileRepository, mockAuthService, command)
      ).rejects.toThrow("User is unauthenticated");
    });

    it("gets the prepared file upload successfully if authenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue({
        user: { id: "1", email: "test@test.com", firstName: "A", lastName: "B" },
      });
      vi.mocked(mockFileRepository.prepareUpload).mockResolvedValue({
        fileId: "file-id",
        storageKey: "key-123",
        uploadUrl: "http://upload.url",
        headers: {},
      });

      const res = await prepareFileUpload(mockFileRepository, mockAuthService, command);
      expect(res.fileId).toBe("file-id");
      expect(res.storageKey).toBe("key-123");
      expect(res.uploadUrl).toBe("http://upload.url");
      expect(mockFileRepository.prepareUpload).toHaveBeenCalledWith(command);
    });
  });

  describe("confirmFileUpload", () => {
    const command: ConfirmFileUploadCommand = {
      fileId: "file-id",
      storageKey: "key",
      mimeType: "image/jpeg",
      sizeBytes: 1000,
    };

    it("throws an error if the user is unauthenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue(null);

      await expect(
        confirmFileUpload(mockFileRepository, mockAuthService, command)
      ).rejects.toThrow("User is unauthenticated");
    });

    it("confirms the upload successfully if authenticated", async () => {
      vi.mocked(mockAuthService.getSession).mockResolvedValue({
        user: { id: "1", email: "test@test.com", firstName: "A", lastName: "B" },
      });
      vi.mocked(mockFileRepository.confirmUpload).mockResolvedValue({
        fileId: "file-id",
        url: "http://final.url/photo.jpg",
        originalName: "photo.jpg",
      });

      const res = await confirmFileUpload(mockFileRepository, mockAuthService, command);
      expect(res.fileId).toBe("file-id");
      expect(res.url).toBe("http://final.url/photo.jpg");
      expect(res.originalName).toBe("photo.jpg");
      expect(mockFileRepository.confirmUpload).toHaveBeenCalledWith(command);
    });
  });
});
