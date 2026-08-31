import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiFileManager } from "./useAiFileManager";
import * as executeUploadModule from "@/application/files/execute-file-upload";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("useAiFileManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(executeUploadModule.executeFileUpload).mockResolvedValue({
      fileId: "fid-1",
      url: "http://file",
      originalName: "test.png",
    });
  });

  it("handles valid file uploads and stores attachments", async () => {
    const { result } = renderHook(() => useAiFileManager());

    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(result.current.attachedFiles.length).toBe(1);
    expect(result.current.attachedFiles[0].name).toBe("test.png");
    expect(result.current.getUploadedImageIds()).toEqual(["fid-1"]);
    expect(result.current.uploadError).toBeNull();
  });

  it("rejects files that exceed maximum size", async () => {
    const { result } = renderHook(() => useAiFileManager());

    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], "large.png", { type: "image/png" });
    const event = {
      target: {
        files: [largeFile],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(result.current.attachedFiles.length).toBe(0);
    expect(result.current.uploadError).not.toBeNull();
  });

  it("removes attached files and clears state", () => {
    const { result } = renderHook(() => useAiFileManager());

    const file1 = new File(["1"], "1.png", { type: "image/png" });
    const file2 = new File(["2"], "2.png", { type: "image/png" });

    act(() => {
      result.current.setAttachedFiles([file1, file2]);
    });

    expect(result.current.attachedFiles.length).toBe(2);

    act(() => {
      result.current.handleRemoveFile(0);
    });

    expect(result.current.attachedFiles.length).toBe(1);
    expect(result.current.attachedFiles[0].name).toBe("2.png");

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.attachedFiles.length).toBe(0);
  });
});
