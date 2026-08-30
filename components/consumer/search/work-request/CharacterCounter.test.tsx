import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CharacterCounter } from "./CharacterCounter";

describe("CharacterCounter", () => {
  it("renders current and max count", () => {
    render(<CharacterCounter current={15} max={100} />);
    expect(screen.getByText("15/100")).toBeInTheDocument();
  });

  it("applies normal style when count is low", () => {
    const { container } = render(<CharacterCounter current={10} max={100} />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-slate-400");
  });

  it("applies warning style when near limit (>=90%)", () => {
    const { container } = render(<CharacterCounter current={90} max={100} />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-amber-500");
  });

  it("applies error style when at or exceeding limit", () => {
    const { container } = render(<CharacterCounter current={100} max={100} />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-red-500");
  });
});
