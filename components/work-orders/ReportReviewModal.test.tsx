import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportReviewModal } from "./ReportReviewModal";

describe("ReportReviewModal", () => {
  it("should offer the four report reasons", () => {
    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={vi.fn()} />
    );

    expect(screen.getByRole("option", { name: "Lenguaje abusivo" })).toHaveValue(
      "abusive_language"
    );
    expect(screen.getByRole("option", { name: "Datos personales" })).toHaveValue(
      "personal_data"
    );
    expect(screen.getByRole("option", { name: "Spam o publicidad" })).toHaveValue(
      "spam_advertising"
    );
    expect(
      screen.getByRole("option", { name: "Contenido ajeno al servicio" })
    ).toHaveValue("unrelated_content");
  });

  it("should submit a selected reason and explanation and show confirmation", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "personal_data");
    await user.type(
      screen.getByRole("textbox", { name: "Explicación (opcional)" }),
      "Publica mi teléfono sin mi autorización."
    );
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(submitReport).toHaveBeenCalledWith({
      category: "personal_data",
      explanation: "Publica mi teléfono sin mi autorización.",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Reporte recibido para revisión."
    );
  });

  it("should close a completed report without submitting it", async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ReportReviewModal open={true} onClose={close} onSubmitReport={submitReport} />
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "personal_data");
    await user.type(
      screen.getByRole("textbox", { name: "Explicación (opcional)" }),
      "Publica mi teléfono sin mi autorización."
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(close).toHaveBeenCalledTimes(1);
    expect(submitReport).not.toHaveBeenCalled();
  });

  it("should show an already-reported notice without showing submission success", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: false, status: 409 });

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Motivo" }),
      "spam_advertising"
    );
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La reseña ya fue reportada y no se puede enviar otro reporte."
    );
    expect(screen.queryByTestId("report-review-success-message")).not.toBeInTheDocument();
  });

  it("should omit an empty optional explanation from the submission", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Motivo" }),
      "spam_advertising"
    );
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(submitReport).toHaveBeenCalledWith({ category: "spam_advertising" });
  });

  it("should pass non-empty explanation text unchanged for server-side whitespace handling", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Motivo" }),
      "abusive_language"
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Explicación (opcional)" }), {
      target: { value: "\uFEFF" },
    });
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(submitReport).toHaveBeenCalledWith({
      category: "abusive_language",
      explanation: "\uFEFF",
    });
  });

  it("should ask for a reason and preserve the form without submitting", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    const correction = screen.getByRole("alert");
    const reason = screen.getByRole("combobox", { name: "Motivo" });
    expect(correction).toHaveTextContent("Seleccioná un motivo para enviar el reporte.");
    expect(reason).toHaveAttribute("aria-invalid", "true");
    expect(reason).toHaveAttribute("aria-describedby", correction.id);
    expect(reason).toHaveValue("");
    expect(submitReport).not.toHaveBeenCalled();
  });

  it("should explain the 500 code point limit and preserve an overlong explanation", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });
    const explanation = "😀".repeat(501);

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "personal_data");
    fireEvent.change(screen.getByRole("textbox", { name: "Explicación (opcional)" }), {
      target: { value: explanation },
    });
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    const correction = screen.getByRole("alert");
    const explanationField = screen.getByRole("textbox", { name: "Explicación (opcional)" });
    expect(correction).toHaveTextContent("Reducí la explicación a 500 caracteres o menos.");
    expect(explanationField).toHaveAttribute("aria-invalid", "true");
    expect(explanationField).toHaveAttribute("aria-describedby", correction.id);
    expect(explanationField).toHaveValue(explanation);
    expect(submitReport).not.toHaveBeenCalled();
  });

  it("should omit an explanation made only of Go-trimmed whitespace", async () => {
    const user = userEvent.setup();
    const submitReport = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ReportReviewModal open={true} onClose={vi.fn()} onSubmitReport={submitReport} />
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Motivo" }),
      "spam_advertising"
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Explicación (opcional)" }), {
      target: { value: " \u0085\u00a0\u3000 " },
    });
    await user.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(submitReport).toHaveBeenCalledWith({ category: "spam_advertising" });
  });
});
