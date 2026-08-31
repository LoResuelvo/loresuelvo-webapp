import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiFileUploadRepository } from "./api-file-upload-repository";
import { api } from "@/infrastructure/api/base-client";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("ApiFileUploadRepository", () => {
  let repository: ApiFileUploadRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiFileUploadRepository();
  });

  describe("prepareUpload", () => {
    it("converts camelCase command to HTTP snake_case payload and maps DTO back to domain model", async () => {
      vi.mocked(api.post).mockResolvedValue({
        file_id: "file-abc",
        key: "profile_photo/file-abc",
        upload_url: "https://storage.test/upload",
        headers: { "x-custom-header": "test-val" },
      });

      const result = await repository.prepareUpload({
        originalName: "avatar.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        purpose: "profile_photo",
      });

      expect(api.post).toHaveBeenCalledWith("/files/presign", {
        original_name: "avatar.png",
        mime_type: "image/png",
        size_bytes: 1024,
        purpose: "profile_photo",
      });

      expect(result).toEqual({
        fileId: "file-abc",
        storageKey: "profile_photo/file-abc",
        uploadUrl: "https://storage.test/upload",
        headers: { "x-custom-header": "test-val" },
      });
    });
  });

  describe("confirmUpload", () => {
    it("converts camelCase command to HTTP snake_case payload and maps DTO back to domain model", async () => {
      vi.mocked(api.post).mockResolvedValue({
        id: "file-abc",
        url: "https://cdn.test/avatar.png",
        original_name: "avatar.png",
      });

      const result = await repository.confirmUpload({
        fileId: "file-abc",
        storageKey: "profile_photo/file-abc",
        mimeType: "image/png",
        sizeBytes: 1024,
      });

      expect(api.post).toHaveBeenCalledWith("/files/file-abc/confirm", {
        key: "profile_photo/file-abc",
        mime_type: "image/png",
        size_bytes: 1024,
      });

      expect(result).toEqual({
        fileId: "file-abc",
        url: "https://cdn.test/avatar.png",
        originalName: "avatar.png",
      });
    });
  });
});
