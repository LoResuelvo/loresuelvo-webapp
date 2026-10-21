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
});
