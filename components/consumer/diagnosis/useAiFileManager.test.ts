import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiFileManager } from "./useAiFileManager";
import * as executeUploadModule from "@/application/files/execute-file-upload";
import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("useAiFileManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn((file: File) => `blob:mock/${file.name}`);
    window.URL.revokeObjectURL = vi.fn();
    vi.mocked(executeUploadModule.executeFileUpload).mockResolvedValue({
      fileId: "fid-1",
      url: "http://file",
      originalName: "test.png",
    });
  });

  it("handles valid file uploads and sets status to uploaded", async () => {
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

    expect(result.current.attachments.length).toBe(1);
    expect(result.current.attachments[0].file.name).toBe("test.png");
    expect(result.current.attachments[0].status).toBe("uploaded");
    expect(result.current.attachments[0].uploaded?.fileId).toBe("fid-1");
    expect(result.current.areAttachmentsReady).toBe(true);
    expect(result.current.uploadError).toBeNull();
  });

  it("uploads only the five accepted slots and keeps uploads sequential", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const order: string[] = [];
    vi.mocked(executeUploadModule.executeFileUpload).mockImplementation(
      async (_repository, request) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        order.push(`start:${request.originalName}`);
        await Promise.resolve();
        order.push(`end:${request.originalName}`);
        inFlight -= 1;
        return {
          fileId: `id-${request.originalName}`,
          url: `https://storage.test/${request.originalName}`,
          originalName: request.originalName,
        };
      }
    );
    const { result } = renderHook(() => useAiFileManager());
    const files = Array.from(
      { length: 7 },
      (_, index) => new File([`${index}`], `${index}.png`, { type: "image/png" })
    );
    const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => result.current.handleFileChange(event));

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledTimes(5);
    expect(result.current.attachments).toHaveLength(5);
    expect(maxInFlight).toBe(1);
    expect(order).toEqual(
      Array.from({ length: 5 }, (_, index) => [
        `start:${index}.png`,
        `end:${index}.png`,
      ]).flat()
    );
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(5);
  });

  it("rejects files that exceed maximum size and sets error", async () => {
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

    expect(result.current.attachments.length).toBe(0);
    expect(result.current.uploadError).not.toBeNull();
  });

  it("rejects files with invalid mime type", async () => {
    const { result } = renderHook(() => useAiFileManager());

    const pdfFile = new File(["pdf content"], "doc.pdf", { type: "application/pdf" });
    const event = {
      target: {
        files: [pdfFile],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(result.current.attachments.length).toBe(0);
    expect(result.current.uploadError).not.toBeNull();
  });

  it("handles upload failures by marking attachment status as failed", async () => {
    vi.mocked(executeUploadModule.executeFileUpload).mockRejectedValueOnce(
      new Error("Upload failed")
    );
    const onUploadError = vi.fn();
    const { result } = renderHook(() => useAiFileManager({ onUploadError }));

    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(result.current.attachments.length).toBe(1);
    expect(result.current.attachments[0].status).toBe("failed");
    expect(result.current.hasFailedFiles).toBe(true);
    expect(result.current.areAttachmentsReady).toBe(false);
    expect(onUploadError).toHaveBeenCalled();
  });

  it("removes attachment by ID and clears all attachments", async () => {
    const { result } = renderHook(() => useAiFileManager());

    const file1 = new File(["1"], "1.png", { type: "image/png" });
    const file2 = new File(["2"], "2.png", { type: "image/png" });
    const event = {
      target: {
        files: [file1, file2],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(result.current.attachments.length).toBe(2);
    const firstId = result.current.attachments[0].id;

    act(() => {
      result.current.handleRemoveAttachment(firstId);
    });

    expect(result.current.attachments.length).toBe(1);
    expect(result.current.attachments[0].file.name).toBe("2.png");

    act(() => {
      result.current.clearAttachments();
    });

    expect(result.current.attachments.length).toBe(0);
  });

  it("does not update attachment if it was removed while upload was in progress", async () => {
    let resolveUpload: (val: ConfirmedFileUpload) => void = () => {};
    vi.mocked(executeUploadModule.executeFileUpload).mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      })
    );

    const { result } = renderHook(() => useAiFileManager());

    const file = new File(["async content"], "async.png", { type: "image/png" });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    let changePromise: Promise<void>;
    act(() => {
      changePromise = result.current.handleFileChange(event);
    });

    expect(result.current.attachments.length).toBe(1);
    expect(result.current.attachments[0].status).toBe("uploading");
    const attachmentId = result.current.attachments[0].id;

    act(() => {
      result.current.handleRemoveAttachment(attachmentId);
    });

    expect(result.current.attachments.length).toBe(0);

    await act(async () => {
      resolveUpload({ fileId: "late-id", url: "http://late.url", originalName: "async.png" });
      await changePromise;
    });

    expect(result.current.attachments.length).toBe(0);
  });

  it("ignores a late upload failure after the attachment was removed", async () => {
    let rejectUpload: (error: Error) => void = () => {};
    vi.mocked(executeUploadModule.executeFileUpload).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpload = reject;
      })
    );
    const onUploadError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useAiFileManager({ onUploadError }));
    const file = new File(["async"], "async.png", { type: "image/png" });
    const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;

    let changePromise!: Promise<void>;
    act(() => {
      changePromise = result.current.handleFileChange(event);
    });
    act(() => result.current.handleRemoveAttachment(result.current.attachments[0].id));
    await act(async () => {
      rejectUpload(new Error("late failure"));
      await changePromise;
    });

    expect(result.current.attachments).toHaveLength(0);
    expect(result.current.uploadError).toBeNull();
    expect(onUploadError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("invalidates pending work on unmount and does not start queued uploads", async () => {
    let resolveUpload: (value: ConfirmedFileUpload) => void = () => {};
    vi.mocked(executeUploadModule.executeFileUpload).mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      })
    );
    const onUploadError = vi.fn();
    const { result, unmount } = renderHook(() => useAiFileManager({ onUploadError }));
    const files = [
      new File(["1"], "1.png", { type: "image/png" }),
      new File(["2"], "2.png", { type: "image/png" }),
    ];
    const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;

    let changePromise!: Promise<void>;
    act(() => {
      changePromise = result.current.handleFileChange(event);
    });
    unmount();
    await act(async () => {
      resolveUpload({ fileId: "late-id", url: "https://late.test/1.png", originalName: "1.png" });
      await changePromise;
    });

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledTimes(1);
    expect(onUploadError).not.toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("keeps uploaded files with duplicate names independent", async () => {
    vi.mocked(executeUploadModule.executeFileUpload)
      .mockResolvedValueOnce({ fileId: "first-id", url: "https://first", originalName: "same.png" })
      .mockResolvedValueOnce({ fileId: "second-id", url: "https://second", originalName: "same.png" });
    const { result } = renderHook(() => useAiFileManager());
    const files = [
      new File(["1"], "same.png", { type: "image/png" }),
      new File(["2"], "same.png", { type: "image/png" }),
    ];
    const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => result.current.handleFileChange(event));
    const firstId = result.current.attachments[0].id;
    act(() => result.current.handleRemoveAttachment(firstId));

    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].status).toBe("uploaded");
    if (result.current.attachments[0].status === "uploaded") {
      expect(result.current.attachments[0].uploaded.fileId).toBe("second-id");
    }
  });
});
