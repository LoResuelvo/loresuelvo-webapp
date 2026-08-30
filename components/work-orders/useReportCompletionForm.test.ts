import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useReportCompletionForm } from "./useReportCompletionForm";
import * as actions from "@/app/work-orders/actions";
import { t } from "@/infrastructure/i18n/translations";

const mockUploadMultipleFiles = vi.fn();
vi.mock("@/hooks/useFileUpload", () => ({
  useFileUpload: () => ({
    uploadMultipleFiles: mockUploadMultipleFiles,
    isUploading: false,
    error: null,
    resetError: vi.fn(),
  }),
}));

vi.mock("@/app/work-orders/actions", () => ({
  reportWorkCompletionAction: vi.fn(),
}));

describe("useReportCompletionForm", () => {
  const defaultOptions = {
    workOrderId: 10,
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("initializes with default state and invalid form", () => {
    const { result } = renderHook(() => useReportCompletionForm(defaultOptions));

    expect(result.current.description).toBe("");
    expect(result.current.selectedImages).toHaveLength(0);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFormValid).toBe(false);
  });

  it("handles adding and removing files correctly", () => {
    const { result } = renderHook(() => useReportCompletionForm(defaultOptions));

    const file = new File(["dummy"], "foto1.jpg", { type: "image/jpeg" });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    expect(result.current.selectedImages).toHaveLength(1);
    expect(result.current.selectedImages[0].file.name).toBe("foto1.jpg");

    const imageId = result.current.selectedImages[0].id;
    act(() => {
      result.current.handleRemoveImage(imageId);
    });

    expect(result.current.selectedImages).toHaveLength(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("validates form when at least one image and description are provided", () => {
    const { result } = renderHook(() => useReportCompletionForm(defaultOptions));

    const file = new File(["dummy"], "foto1.jpg", { type: "image/jpeg" });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
      result.current.setDescription("Trabajo terminado.");
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it("submits completion report successfully", async () => {
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);
    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: true,
      report: {
        id: 1,
        workOrderId: 10,
        description: "Trabajo terminado.",
        imageFileIds: ["file-id-1"],
        createdOn: new Date().toISOString(),
      },
    });

    const { result } = renderHook(() => useReportCompletionForm(defaultOptions));

    const file = new File(["dummy"], "foto1.jpg", { type: "image/jpeg" });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
      result.current.setDescription("Trabajo terminado.");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUploadMultipleFiles).toHaveBeenCalled();
    expect(actions.reportWorkCompletionAction).toHaveBeenCalledWith(10, "Trabajo terminado.", ["file-id-1"]);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("handles error during submission", async () => {
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);
    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: false,
      status: 409,
      message: "already reported",
    });

    const { result } = renderHook(() => useReportCompletionForm(defaultOptions));

    const file = new File(["dummy"], "foto1.jpg", { type: "image/jpeg" });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
      result.current.setDescription("Trabajo terminado.");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.errorMessage).toBe(t.workOrderCompletion.errors.alreadyReported);
  });

  it("resets state and triggers callbacks on handleClose", () => {
    const { result } = renderHook(() => useReportCompletionForm(defaultOptions));

    act(() => {
      result.current.handleClose();
    });

    expect(defaultOptions.onClose).toHaveBeenCalled();
  });
});
