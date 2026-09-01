import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useInitialDiagnosis } from "./useInitialDiagnosis";
import { createAiConversationAction } from "@/app/consumidor/mensajes-ia/actions";
import { executeFileUpload } from "@/application/files/execute-file-upload";

const mockAssign = vi.fn();

Object.defineProperty(window, "location", {
  value: {
    _href: "",
    get href() {
      return this._href;
    },
    set href(url: string) {
      this._href = url;
      mockAssign(url);
    },
  },
  writable: true,
});

global.URL.createObjectURL = vi.fn(() => "blob:https://loresuelvo.com/mock-blob");
global.URL.revokeObjectURL = vi.fn();

vi.mock("@/app/consumidor/mensajes-ia/actions", () => ({
  createAiConversationAction: vi.fn().mockResolvedValue({ success: true, data: { id: 10 } }),
}));

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn().mockResolvedValue({
    fileId: "confirmed-123",
    url: "https://storage.test/img.png",
    originalName: "test.png",
  }),
}));

describe("useInitialDiagnosis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default values", () => {
    const { result } = renderHook(() => useInitialDiagnosis());

    expect(result.current.message).toBe("");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.attachments).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.previewImage).toBeNull();
  });

  it("updates message via setMessage", () => {
    const { result } = renderHook(() => useInitialDiagnosis());

    act(() => {
      result.current.setMessage("Fuga en el baño");
    });

    expect(result.current.message).toBe("Fuga en el baño");
  });

  it("handles valid file change", () => {
    const { result } = renderHook(() => useInitialDiagnosis());
    const file = new File(["content"], "test.png", { type: "image/png" });

    act(() => {
      result.current.handleFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].status).toBe("selected");
    expect(result.current.error).toBeNull();
  });

  it("sets error when file is too large", () => {
    const { result } = renderHook(() => useInitialDiagnosis());
    const largeFile = new File(["content"], "large.png", { type: "image/png" });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    act(() => {
      result.current.handleFileChange({
        target: { files: [largeFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.attachments).toHaveLength(0);
    expect(result.current.error).toBeTruthy();
  });

  it("submits conversation with uploaded file IDs and redirects on success", async () => {
    const { result } = renderHook(() => useInitialDiagnosis());
    const file = new File(["content"], "test.png", { type: "image/png" });

    act(() => {
      result.current.setMessage("Mi canilla gotea");
      result.current.handleFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    const preventDefault = vi.fn();
    await act(async () => {
      await result.current.handleSubmit({ preventDefault } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(executeFileUpload).toHaveBeenCalled();
    expect(createAiConversationAction).toHaveBeenCalledWith("Mi canilla gotea", ["confirmed-123"]);
    expect(mockAssign).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=10");
  });

  it("sets error and does not create conversation if upload fails", async () => {
    vi.mocked(executeFileUpload).mockRejectedValueOnce(new Error("Network upload failed"));

    const { result } = renderHook(() => useInitialDiagnosis());
    const file = new File(["content"], "test.png", { type: "image/png" });

    act(() => {
      result.current.setMessage("Mi canilla gotea");
      result.current.handleFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    const preventDefault = vi.fn();
    await act(async () => {
      await result.current.handleSubmit({ preventDefault } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(result.current.error).toBeTruthy();
    expect(createAiConversationAction).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("closes preview modal when the previewed attachment is removed", () => {
    const { result } = renderHook(() => useInitialDiagnosis());
    const file = new File(["content"], "test.png", { type: "image/png" });

    act(() => {
      result.current.handleFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    const added = result.current.attachments[0];
    act(() => {
      result.current.setPreviewImage({ url: added.previewUrl, name: added.file.name });
    });

    expect(result.current.previewImage).toEqual({ url: added.previewUrl, name: "test.png" });

    act(() => {
      result.current.handleRemoveAttachment(added.id);
    });

    expect(result.current.previewImage).toBeNull();
    expect(result.current.attachments).toHaveLength(0);
  });

  it("does not redirect or update state if unmounted while createAiConversationAction is pending", async () => {
    let actionCalled = false;
    let resolveAction!: (val: Awaited<ReturnType<typeof createAiConversationAction>>) => void;
    vi.mocked(createAiConversationAction).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          actionCalled = true;
          resolveAction = resolve;
        })
    );

    const { result, unmount } = renderHook(() => useInitialDiagnosis());

    act(() => {
      result.current.setMessage("Mi canilla gotea");
    });

    const preventDefault = vi.fn();
    let submitPromise!: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmit({ preventDefault } as unknown as React.FormEvent<HTMLFormElement>);
    });

    while (!actionCalled) {
      await new Promise((r) => setTimeout(r, 5));
    }

    // Unmount before action resolves
    unmount();

    resolveAction({
      success: true,
      data: {
        id: 99,
        status: "active",
        title: "Test",
        responseStatus: "completed",
        diagnosisCompleted: false,
        updatedOn: new Date().toISOString(),
        recommendedProviders: [],
        messages: [],
      },
    });

    await act(async () => {
      await submitPromise;
    });

    expect(mockAssign).not.toHaveBeenCalledWith(expect.stringContaining("99"));
  });
});
