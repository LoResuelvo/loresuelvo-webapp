import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ReportWorkCompletionModal from "./ReportWorkCompletionModal";
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

describe("ReportWorkCompletionModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    workOrderId: 10,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("renders modal with accessible title, image upload and description textarea", () => {
    render(<ReportWorkCompletionModal {...defaultProps} />);

    expect(
      screen.getByRole("dialog", { name: t.workOrderCompletion.modalTitle })
    ).toBeInTheDocument();
    expect(
      screen.getByText(t.workOrderCompletion.evidenceImagesLabel)
    ).toBeInTheDocument();
    expect(
      screen.getByText(t.workOrderCompletion.descriptionLabel)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.workOrderCompletion.submitButton })
    ).toBeInTheDocument();
  });

  it("keeps submit button disabled when form is empty", () => {
    render(<ReportWorkCompletionModal {...defaultProps} />);

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button when 1 image is attached and description is filled", async () => {
    const user = userEvent.setup();
    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    const file = new File(["dummy"], "foto1.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);

    const textarea = screen.getByRole("textbox", {
      name: /descripción de trabajo realizado/i,
    });
    await user.type(textarea, "Trabajo finalizado con éxito.");

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    expect(submitBtn).toBeEnabled();
  });

  it("allows previewing and removing attached images", async () => {
    const user = userEvent.setup();
    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    const file1 = new File(["dummy1"], "foto1.jpg", { type: "image/jpeg" });
    const file2 = new File(["dummy2"], "foto2.jpg", { type: "image/jpeg" });

    await user.upload(fileInput, [file1, file2]);

    expect(screen.getByRole("img", { name: /vista previa de foto1\.jpg/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /vista previa de foto2\.jpg/i })).toBeInTheDocument();

    const removeBtn1 = screen.getByRole("button", {
      name: `${t.workOrderCompletion.removeImageText} foto1.jpg`,
    });
    await user.click(removeBtn1);

    expect(screen.queryByRole("img", { name: /vista previa de foto1\.jpg/i })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /vista previa de foto2\.jpg/i })).toBeInTheDocument();
  });

  it("limits maximum images to 3", async () => {
    const user = userEvent.setup();
    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    const files = [
      new File(["1"], "foto1.jpg", { type: "image/jpeg" }),
      new File(["2"], "foto2.jpg", { type: "image/jpeg" }),
      new File(["3"], "foto3.jpg", { type: "image/jpeg" }),
      new File(["4"], "foto4.jpg", { type: "image/jpeg" }),
    ];

    await user.upload(fileInput, files);

    const previews = screen.getAllByRole("img", { name: /vista previa/i });
    expect(previews).toHaveLength(3);
  });

  it("submits completion report successfully and shows success message", async () => {
    const user = userEvent.setup();
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);

    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: true,
      report: {
        id: 1,
        workOrderId: 10,
        description: "Trabajo finalizado.",
        imageFileIds: ["file-id-1"],
        createdOn: new Date().toISOString(),
      },
    });

    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    await user.upload(fileInput, new File(["dummy"], "foto1.jpg", { type: "image/jpeg" }));

    const textarea = screen.getByRole("textbox", {
      name: /descripción de trabajo realizado/i,
    });
    await user.type(textarea, "Trabajo finalizado.");

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUploadMultipleFiles).toHaveBeenCalledWith(
        expect.any(Array),
        { purpose: "work_order_completion_image" }
      );
      expect(actions.reportWorkCompletionAction).toHaveBeenCalledWith(
        10,
        "Trabajo finalizado.",
        ["file-id-1"]
      );
      expect(screen.getByText(t.workOrderCompletion.successMessage)).toBeInTheDocument();
    });
  });

  it("displays error message when reportWorkCompletionAction returns status 409", async () => {
    const user = userEvent.setup();
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);

    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: false,
      status: 409,
    });

    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    await user.upload(fileInput, new File(["dummy"], "foto1.jpg", { type: "image/jpeg" }));

    const textarea = screen.getByRole("textbox", {
      name: /descripción de trabajo realizado/i,
    });
    await user.type(textarea, "Segundo reporte.");

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(t.workOrderCompletion.errors.alreadyReported)
      ).toBeInTheDocument();
    });
  });

  it("displays futureScheduledDate error when API returns 409 not ready", async () => {
    const user = userEvent.setup();
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);

    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: false,
      status: 409,
      message: "work order is not ready for completion",
    });

    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    await user.upload(fileInput, new File(["dummy"], "foto1.jpg", { type: "image/jpeg" }));

    const textarea = screen.getByRole("textbox", {
      name: /descripción de trabajo realizado/i,
    });
    await user.type(textarea, "Reporte antes de fecha.");

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(t.workOrderCompletion.errors.futureScheduledDate)
      ).toBeInTheDocument();
    });
  });

  it("displays unauthorized error when API returns 403", async () => {
    const user = userEvent.setup();
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);

    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: false,
      status: 403,
      message: "only the assigned provider can report work completion",
    });

    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    await user.upload(fileInput, new File(["dummy"], "foto1.jpg", { type: "image/jpeg" }));

    const textarea = screen.getByRole("textbox", {
      name: /descripción de trabajo realizado/i,
    });
    await user.type(textarea, "Reporte.");

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(t.workOrderCompletion.errors.unauthorized)
      ).toBeInTheDocument();
    });
  });

  it("displays generic error message on unexpected failure", async () => {
    const user = userEvent.setup();
    mockUploadMultipleFiles.mockResolvedValue([
      { fileId: "file-id-1", url: "https://url1", originalName: "foto1.jpg" },
    ]);

    vi.mocked(actions.reportWorkCompletionAction).mockResolvedValue({
      ok: false,
      status: null,
    });

    render(<ReportWorkCompletionModal {...defaultProps} />);

    const fileInput = screen.getByTestId("completion-file-input");
    await user.upload(fileInput, new File(["dummy"], "foto1.jpg", { type: "image/jpeg" }));

    const textarea = screen.getByRole("textbox", {
      name: /descripción de trabajo realizado/i,
    });
    await user.type(textarea, "Reporte.");

    const submitBtn = screen.getByRole("button", {
      name: t.workOrderCompletion.submitButton,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(t.workOrderCompletion.errors.generic)
      ).toBeInTheDocument();
    });
  });
});
