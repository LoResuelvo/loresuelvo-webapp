import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StarRatingInput } from "./StarRatingInput";

describe("StarRatingInput", () => {
  it("should render 5 interactive star rating buttons", () => {
    render(<StarRatingInput value={0} onChange={vi.fn()} />);

    const radiogroup = screen.getByRole("radiogroup", {
      name: /calificación con estrellas/i,
    });
    expect(radiogroup).toBeInTheDocument();

    const buttons = screen.getAllByRole("radio");
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute("aria-label", "1 estrella");
    expect(buttons[4]).toHaveAttribute("aria-label", "5 estrellas");
  });

  it("should mark selected star with aria-checked", () => {
    render(<StarRatingInput value={4} onChange={vi.fn()} />);

    const buttons = screen.getAllByRole("radio");
    expect(buttons[3]).toHaveAttribute("aria-checked", "true");
    expect(buttons[0]).toHaveAttribute("aria-checked", "false");
  });

  it("should call onChange with the correct rating when a star is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRatingInput value={0} onChange={handleChange} />);

    const star5 = screen.getByRole("radio", { name: "5 estrellas" });
    await user.click(star5);

    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it("should update hover state on mouse enter and leave", () => {
    render(<StarRatingInput value={2} onChange={vi.fn()} />);

    const star4 = screen.getByTestId("star-rating-4");
    fireEvent.mouseEnter(star4);

    // After hover, star 4 should have filled star styling
    const icon = star4.querySelector("svg");
    expect(icon).toHaveClass("fill-amber-400");

    fireEvent.mouseLeave(star4);
  });

  it("should disable buttons when disabled prop is true", () => {
    render(<StarRatingInput value={3} onChange={vi.fn()} disabled={true} />);

    const buttons = screen.getAllByRole("radio");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
