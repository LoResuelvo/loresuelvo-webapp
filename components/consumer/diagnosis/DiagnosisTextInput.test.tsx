import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DiagnosisTextInput } from "./DiagnosisTextInput";
import { t } from "@/infrastructure/i18n/translations";

describe("DiagnosisTextInput", () => {
  it("renders textarea with correct placeholder and value", () => {
    render(<DiagnosisTextInput value="Problema con la cañería" onChange={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(t.consumerDiagnosis.hero.placeholder);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("Problema con la cañería");
  });

  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<DiagnosisTextInput value="" onChange={handleChange} />);

    const textarea = screen.getByPlaceholderText(t.consumerDiagnosis.hero.placeholder);
    fireEvent.change(textarea, { target: { value: "Nueva descripción" } });

    expect(handleChange).toHaveBeenCalledWith("Nueva descripción");
  });

  it("disables textarea when disabled prop is true", () => {
    render(<DiagnosisTextInput value="" onChange={vi.fn()} disabled={true} />);

    const textarea = screen.getByPlaceholderText(t.consumerDiagnosis.hero.placeholder);
    expect(textarea).toBeDisabled();
  });
});
