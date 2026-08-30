import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CompletionFormFields } from "./CompletionFormFields";
import { t } from "@/infrastructure/i18n/translations";

describe("CompletionFormFields", () => {
  it("renders textarea with label and placeholder", () => {
    render(<CompletionFormFields description="" onChange={vi.fn()} />);

    expect(screen.getByText(t.workOrderCompletion.descriptionLabel)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(t.workOrderCompletion.descriptionPlaceholder)
    ).toBeInTheDocument();
  });

  it("calls onChange when typing into description", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<CompletionFormFields description="" onChange={handleChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "A");

    expect(handleChange).toHaveBeenCalledWith("A");
  });
});
