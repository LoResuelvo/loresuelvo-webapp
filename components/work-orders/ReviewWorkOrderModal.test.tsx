import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReviewWorkOrderModal } from "./ReviewWorkOrderModal";

describe("ReviewWorkOrderModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render modal with submit button disabled when rating is 0", () => {
    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        onSubmitReview={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Calificar servicio" })).toBeInTheDocument();
    expect(screen.getByText("0/500")).toBeInTheDocument();

    const submitBtn = screen.getByTestId("submit-review-button");
    expect(submitBtn).toBeDisabled();
  });

  it("should enable submit button when a star rating is selected", async () => {
    const user = userEvent.setup();
    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        onSubmitReview={vi.fn()}
      />
    );

    const star5 = screen.getByRole("radio", { name: "5 estrellas" });
    await user.click(star5);

    const submitBtn = screen.getByTestId("submit-review-button");
    expect(submitBtn).toBeEnabled();
  });

  it("should update character count when entering comment", async () => {
    const user = userEvent.setup();
    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        onSubmitReview={vi.fn()}
      />
    );

    const textarea = screen.getByTestId("review-comment-input");
    await user.type(textarea, "Excelente trabajo");

    expect(screen.getByText("17/500")).toBeInTheDocument();
  });

  it("should submit review and display success message on successful response", async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({ ok: true });
    const mockSuccess = vi.fn();

    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        onSubmitReview={mockSubmit}
        onSuccess={mockSuccess}
      />
    );

    const star5 = screen.getByRole("radio", { name: "5 estrellas" });
    await user.click(star5);

    const textarea = screen.getByTestId("review-comment-input");
    await user.type(textarea, "Excelente atención");

    const submitBtn = screen.getByTestId("submit-review-button");
    await user.click(submitBtn);

    expect(mockSubmit).toHaveBeenCalledWith({
      rating: 5,
      comment: "Excelente atención",
    });

    await waitFor(() => {
      expect(screen.getByTestId("review-success-message")).toBeInTheDocument();
      expect(screen.getByText("Reseña registrada con éxito")).toBeInTheDocument();
    });
  });

  it("should show error message when submission returns 409 conflict", async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
    });

    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        onSubmitReview={mockSubmit}
      />
    );

    const star4 = screen.getByRole("radio", { name: "4 estrellas" });
    await user.click(star4);

    const submitBtn = screen.getByTestId("submit-review-button");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("La orden de trabajo ya cuenta con una reseña previa.")
      ).toBeInTheDocument();
    });
  });

  it("should show error message on server error without losing comment", async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={vi.fn()}
        workOrderId={10}
        onSubmitReview={mockSubmit}
      />
    );

    const star5 = screen.getByRole("radio", { name: "5 estrellas" });
    await user.click(star5);

    const textarea = screen.getByTestId("review-comment-input");
    await user.type(textarea, "Buen trabajo");

    const submitBtn = screen.getByTestId("submit-review-button");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Hubo un problema al registrar la reseña. Por favor intenta nuevamente.")
      ).toBeInTheDocument();
    });

    expect(textarea).toHaveValue("Buen trabajo");
  });

  it("should call onClose when clicking cancel button", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <ReviewWorkOrderModal
        open={true}
        onClose={handleClose}
        workOrderId={10}
        onSubmitReview={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
