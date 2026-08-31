import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useInitialDiagnosis } from "./useInitialDiagnosis";
import { createAiConversationAction } from "@/app/consumidor/mensajes-ia/actions";

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
    expect(result.current.attachedFiles).toEqual([]);
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

    expect(result.current.attachedFiles).toHaveLength(1);
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

    expect(result.current.attachedFiles).toHaveLength(0);
    expect(result.current.error).toBeTruthy();
  });

  it("submits conversation and redirects on success", async () => {
    const { result } = renderHook(() => useInitialDiagnosis());

    act(() => {
      result.current.setMessage("Mi canilla gotea");
    });

    const preventDefault = vi.fn();
    await act(async () => {
      await result.current.handleSubmit({ preventDefault } as unknown as React.FormEvent<HTMLFormElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(createAiConversationAction).toHaveBeenCalledWith("Mi canilla gotea", undefined);
    expect(mockAssign).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=10");
  });
});
