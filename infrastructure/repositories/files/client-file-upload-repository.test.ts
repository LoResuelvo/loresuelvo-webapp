import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { ClientFileUploadRepository, type ActionResult } from "./client-file-upload-repository";
import type {
  PrepareFileUploadCommand,
  ConfirmFileUploadCommand,
  PreparedFileUpload,
  ConfirmedFileUpload,
} from "@/ports/files/file-upload-repository";

describe("ClientFileUploadRepository", () => {
  let mockPrepareUpload: Mock<(command: PrepareFileUploadCommand) => Promise<ActionResult<PreparedFileUpload>>>;
  let mockConfirmUpload: Mock<(command: ConfirmFileUploadCommand) => Promise<ActionResult<ConfirmedFileUpload>>>;
  let repository: ClientFileUploadRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepareUpload = vi.fn();
    mockConfirmUpload = vi.fn();
    repository = new ClientFileUploadRepository({
      prepareUpload: mockPrepareUpload,
      confirmUpload: mockConfirmUpload,
    });
  });

  describe("prepareUpload", () => {
    const command: PrepareFileUploadCommand = {
      originalName: "foto.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      purpose: "profile_photo",
    };

    it("returns prepared file upload data on action success", async () => {
      const preparedData: PreparedFileUpload = {
        fileId: "f-1",
        storageKey: "profile_photo/f-1",
        uploadUrl: "https://upload.example.com",
        headers: { "x-header": "value" },
      };
      mockPrepareUpload.mockResolvedValue({ success: true, data: preparedData });

      const result = await repository.prepareUpload(command);

      expect(mockPrepareUpload).toHaveBeenCalledWith(command);
      expect(result).toEqual(preparedData);
    });

    it("throws an error when action fails", async () => {
      mockPrepareUpload.mockResolvedValue({ success: false, error: "Fallo al obtener URL" });

      await expect(repository.prepareUpload(command)).rejects.toThrow("Fallo al obtener URL");
      expect(mockPrepareUpload).toHaveBeenCalledWith(command);
    });
  });

  describe("confirmUpload", () => {
    const command: ConfirmFileUploadCommand = {
      fileId: "f-1",
      storageKey: "profile_photo/f-1",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
    };

    it("returns confirmed file upload data on action success", async () => {
      const confirmedData: ConfirmedFileUpload = {
        fileId: "f-1",
        url: "https://cdn.example.com/foto.jpg",
        originalName: "foto.jpg",
      };
      mockConfirmUpload.mockResolvedValue({ success: true, data: confirmedData });

      const result = await repository.confirmUpload(command);

      expect(mockConfirmUpload).toHaveBeenCalledWith(command);
      expect(result).toEqual(confirmedData);
    });

    it("throws an error when action fails", async () => {
      mockConfirmUpload.mockResolvedValue({ success: false, error: "Fallo al confirmar archivo" });

      await expect(repository.confirmUpload(command)).rejects.toThrow("Fallo al confirmar archivo");
      expect(mockConfirmUpload).toHaveBeenCalledWith(command);
    });
  });

  describe("upload", () => {
    it("performs PUT request with body and headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const file = new Blob(["content"], { type: "image/jpeg" });
      await repository.upload({
        uploadUrl: "https://upload.example.com",
        file,
        headers: { "x-header": "test" },
      });

      expect(mockFetch).toHaveBeenCalledWith("https://upload.example.com", {
        method: "PUT",
        body: file,
        headers: { "x-header": "test" },
      });
    });

    it("throws an error when PUT request fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
      global.fetch = mockFetch;

      const file = new Blob(["content"], { type: "image/jpeg" });
      await expect(
        repository.upload({
          uploadUrl: "https://upload.example.com",
          file,
          headers: {},
        })
      ).rejects.toThrow("Error al subir archivo a S3/R2");
    });
  });
});
