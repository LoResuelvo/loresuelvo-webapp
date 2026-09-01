import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useInitialDiagnosisAttachments } from "./useInitialDiagnosisAttachments";
import * as executeUploadModule from "@/application/files/execute-file-upload";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

describe("useInitialDiagnosisAttachments", () => {
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockImplementation((file: File) => `blob:https://test.local/${file.name}`);
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  it("adds files with selected status without triggering immediate uploads", () => {
    const { result } = renderHook(() => useInitialDiagnosisAttachments());

    const file = new File(["dummy content"], "foto.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file]);
    });

    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].status).toBe("selected");
    expect(executeUploadModule.executeFileUpload).not.toHaveBeenCalled();
  });

  it("uploads pending attachments sequentially upon uploadAllPending and returns ordered IDs", async () => {
    const uploadSequence: string[] = [];
    vi.mocked(executeUploadModule.executeFileUpload).mockImplementation(
      async (_repo, cmd) => {
        uploadSequence.push(cmd.originalName);
        return {
          fileId: `id-${cmd.originalName}`,
          url: `https://storage.test/${cmd.originalName}`,
          originalName: cmd.originalName,
        };
      }
    );

    const { result } = renderHook(() => useInitialDiagnosisAttachments());

    const file1 = new File(["1"], "foto1.jpg", { type: "image/jpeg" });
    const file2 = new File(["2"], "foto2.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1, file2]);
    });

    let res: Awaited<ReturnType<typeof result.current.uploadAllPending>> | undefined;
    await act(async () => {
      res = await result.current.uploadAllPending();
    });

    expect(uploadSequence).toEqual(["foto1.jpg", "foto2.jpg"]);
    expect(res).toEqual({
      status: "completed",
      imageIds: ["id-foto1.jpg", "id-foto2.jpg"],
    });
    expect(result.current.attachments.every((a) => a.status === "uploaded")).toBe(true);
  });

  it("halts on partial failure and does not re-upload confirmed files on retry", async () => {
    let callCount = 0;
    vi.mocked(executeUploadModule.executeFileUpload).mockImplementation(
      async (_repo, cmd) => {
        callCount++;
        if (cmd.originalName === "foto2.jpg" && callCount === 2) {
          throw new Error("Upload failed for foto2");
        }
        return {
          fileId: `id-${cmd.originalName}`,
          url: `https://storage.test/${cmd.originalName}`,
          originalName: cmd.originalName,
        };
      }
    );

    const { result } = renderHook(() => useInitialDiagnosisAttachments());

    const file1 = new File(["1"], "foto1.jpg", { type: "image/jpeg" });
    const file2 = new File(["2"], "foto2.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1, file2]);
    });

    // First attempt fails at foto2
    await act(async () => {
      await expect(result.current.uploadAllPending()).rejects.toThrow("Upload failed for foto2");
    });

    expect(result.current.attachments[0].status).toBe("uploaded");
    expect(result.current.attachments[1].status).toBe("failed");
    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledTimes(2);

    // Second attempt should skip foto1 and retry foto2
    let retryRes: Awaited<ReturnType<typeof result.current.uploadAllPending>> | undefined;
    await act(async () => {
      retryRes = await result.current.uploadAllPending();
    });

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledTimes(3);
    expect(retryRes).toEqual({
      status: "completed",
      imageIds: ["id-foto1.jpg", "id-foto2.jpg"],
    });
    expect(result.current.attachments.every((a) => a.status === "uploaded")).toBe(true);
  });

  it("returns cancelled and does not run subsequent uploads if unmounted during upload", async () => {
    const resolvers: Array<(val: { fileId: string; url: string; originalName: string }) => void> = [];

    vi.mocked(executeUploadModule.executeFileUpload).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { result, unmount } = renderHook(() => useInitialDiagnosisAttachments());

    const file1 = new File(["1"], "foto1.jpg", { type: "image/jpeg" });
    const file2 = new File(["2"], "foto2.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1, file2]);
    });

    let pendingPromise: ReturnType<typeof result.current.uploadAllPending> | undefined;
    act(() => {
      pendingPromise = result.current.uploadAllPending();
    });

    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledTimes(1);

    // Unmount before resolving first upload
    unmount();
    resolvers[0]({ fileId: "id-1", url: "https://1", originalName: "foto1.jpg" });

    let finalRes: Awaited<ReturnType<typeof result.current.uploadAllPending>> | undefined;
    await act(async () => {
      finalRes = await pendingPromise;
    });

    expect(finalRes).toEqual({ status: "cancelled" });
    expect(executeUploadModule.executeFileUpload).toHaveBeenCalledTimes(1);
  });
});
