import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useManagedImageAttachments } from "./useManagedImageAttachments";
import type { ManagedImageAttachment } from "./managed-image-attachment";

describe("useManagedImageAttachments", () => {
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockImplementation((file: File) => `blob:https://test.local/${file.name}`);
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  const createAttachment = (base: ManagedImageAttachment) => ({ ...base, customTag: "test" });

  it("assigns unique IDs to two different files with the same name", () => {
    const { result } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

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

  it("creates URL exactly once on add and does not create URLs during rerender", () => {
    const { result, rerender } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

    const file1 = new File(["content 1"], "foto.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1]);
    });

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
  });

  it("removes only the specified attachment by ID and revokes URL exactly once", () => {
    const { result } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

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
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(firstAttachment.previewUrl);
  });

  it("respects the maxAttachments capacity", () => {
    const { result } = renderHook(() =>
      useManagedImageAttachments({ createAttachment, maxAttachments: 5 })
    );

    const files = Array.from(
      { length: 7 },
      (_, i) => new File([`c${i}`], `foto${i}.jpg`, { type: "image/jpeg" })
    );

    act(() => {
      result.current.addAttachments(files);
    });

    expect(result.current.attachments).toHaveLength(5);
  });

  it("replaces attachment completely via replaceAttachment and updates snapshot", () => {
    const { result } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

    const file = new File(["1"], "1.jpg", { type: "image/jpeg" });
    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments([file]);
    });

    const attachmentId = added![0].id;

    act(() => {
      result.current.replaceAttachment(attachmentId, (current) => ({
        ...current,
        customTag: "updated-tag",
      }));
    });

    expect(result.current.attachments[0].customTag).toBe("updated-tag");
    expect(result.current.getSnapshot()[0].customTag).toBe("updated-tag");
  });

  it("ignores replaceAttachment and addAttachments after unmount", () => {
    const { result, unmount } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

    const file = new File(["1"], "1.jpg", { type: "image/jpeg" });
    let added: ReturnType<typeof result.current.addAttachments>;
    act(() => {
      added = result.current.addAttachments([file]);
    });

    const attachmentId = added![0].id;
    unmount();

    act(() => {
      result.current.replaceAttachment(attachmentId, (current) => ({
        ...current,
        customTag: "post-unmount",
      }));
      result.current.addAttachments([new File(["2"], "2.jpg", { type: "image/jpeg" })]);
    });

    expect(result.current.isMounted()).toBe(false);
    expect(result.current.isAttachmentActive(attachmentId)).toBe(false);
  });

  it("revokes all preview URLs on clearAttachments", () => {
    const { result } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

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
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
    urls.forEach((url) => {
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
    });
  });

  it("revokes active preview URLs when hook unmounts exactly once", () => {
    const { result, unmount } = renderHook(() =>
      useManagedImageAttachments({ createAttachment })
    );

    const file1 = new File(["1"], "1.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addAttachments([file1]);
    });

    const url = result.current.attachments[0].previewUrl;

    unmount();

    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
  });
});
