import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiImageAttachments } from "./useAiImageAttachments";

describe("useAiImageAttachments", () => {
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockImplementation(
      (file: File) => `blob:https://test.local/${file.name}-${mockCreateObjectURL.mock.calls.length}`
    );
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  it("assigns unique IDs to two different files with the same name", () => {
    const { result } = renderHook(() => useAiImageAttachments());

    const file1 = new File(["content 1"], "foto.jpg", { type: "image/jpeg" });
    const file2 = new File(["content 2"], "foto.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1, file2]);
    });

    expect(result.current.attachments).toHaveLength(2);
    expect(result.current.attachments[0].id).not.toBe(result.current.attachments[1].id);
    expect(result.current.attachments[0].file.name).toBe("foto.jpg");
    expect(result.current.attachments[1].file.name).toBe("foto.jpg");
  });

  it("removes only the specified attachment by ID when multiple have the same name", () => {
    const { result } = renderHook(() => useAiImageAttachments());

    const file1 = new File(["content 1"], "foto.jpg", { type: "image/jpeg" });
    const file2 = new File(["content 2"], "foto.jpg", { type: "image/jpeg" });

    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments([file1, file2]);
    });

    const [firstAttachment, secondAttachment] = added!;

    act(() => {
      result.current.removeAttachment(firstAttachment.id);
    });

    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].id).toBe(secondAttachment.id);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(firstAttachment.previewUrl);
  });

  it("respects the 5-item capacity and does not add excess files", () => {
    const { result } = renderHook(() => useAiImageAttachments());

    const files = Array.from({ length: 7 }, (_, i) => new File([`c${i}`], `foto${i}.jpg`, { type: "image/jpeg" }));

    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments(files);
    });

    expect(added!).toHaveLength(5);
    expect(result.current.attachments).toHaveLength(5);
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(5);

    const extraFile = new File(["extra"], "extra.jpg", { type: "image/jpeg" });
    act(() => {
      result.current.addAttachments([extraFile]);
    });

    expect(result.current.attachments).toHaveLength(5);
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(5);
  });

  it("revokes all preview URLs on clearAttachments", () => {
    const { result } = renderHook(() => useAiImageAttachments());

    const file1 = new File(["1"], "1.jpg", { type: "image/jpeg" });
    const file2 = new File(["2"], "2.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1, file2]);
    });

    const urls = result.current.attachments.map((a) => a.previewUrl);

    act(() => {
      result.current.clearAttachments();
    });

    expect(result.current.attachments).toHaveLength(0);
    urls.forEach((url) => {
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
    });
  });

  it("revokes active preview URLs when hook unmounts", () => {
    const { result, unmount } = renderHook(() => useAiImageAttachments());

    const file1 = new File(["1"], "1.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1]);
    });

    const url = result.current.attachments[0].previewUrl;

    unmount();

    expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
    expect(result.current.isAttachmentActive(result.current.attachments[0]?.id ?? "")).toBe(false);
  });

  it("revokes every preview URL exactly once across remove, clear, and unmount", () => {
    const { result, unmount } = renderHook(() => useAiImageAttachments());
    const files = [
      new File(["1"], "1.jpg", { type: "image/jpeg" }),
      new File(["2"], "2.jpg", { type: "image/jpeg" }),
    ];

    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments(files);
    });
    act(() => result.current.removeAttachment(added![0].id));
    act(() => result.current.clearAttachments());
    unmount();

    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
    for (const attachment of added!) {
      expect(
        mockRevokeObjectURL.mock.calls.filter(([url]) => url === attachment.previewUrl)
      ).toHaveLength(1);
    }
  });

  it("correctly identifies active attachments via isAttachmentActive", () => {
    const { result } = renderHook(() => useAiImageAttachments());

    const file = new File(["1"], "1.jpg", { type: "image/jpeg" });

    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments([file]);
    });

    const id = added![0].id;
    expect(result.current.isAttachmentActive(id)).toBe(true);

    act(() => {
      result.current.removeAttachment(id);
    });

    expect(result.current.isAttachmentActive(id)).toBe(false);
  });

  it("transitions an active attachment to uploaded", () => {
    const { result } = renderHook(() => useAiImageAttachments());

    const file = new File(["1"], "1.jpg", { type: "image/jpeg" });

    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments([file]);
    });

    act(() => {
      result.current.markAttachmentUploaded(added![0], {
        fileId: "fid-1",
        url: "https://remote.url/1.jpg",
        originalName: "1.jpg",
      });
    });

    expect(result.current.attachments[0].status).toBe("uploaded");
    expect(result.current.attachments[0].uploaded?.fileId).toBe("fid-1");
  });

  it("ignores a late transition after the attachment was removed", () => {
    const { result } = renderHook(() => useAiImageAttachments());
    const file = new File(["1"], "1.jpg", { type: "image/jpeg" });

    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments([file]);
    });
    act(() => result.current.removeAttachment(added![0].id));
    act(() => {
      result.current.markAttachmentUploaded(added![0], {
        fileId: "late-id",
        url: "https://remote.url/late.jpg",
        originalName: "1.jpg",
      });
    });

    expect(result.current.attachments).toHaveLength(0);
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
