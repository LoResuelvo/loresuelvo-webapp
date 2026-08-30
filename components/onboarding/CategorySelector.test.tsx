import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategorySelector } from "./CategorySelector";

const mockCategories = [
  { id: 1, name: "Plomería" },
  { id: 2, name: "Electricidad" },
];

describe("CategorySelector", () => {
  it("renders select with category options", () => {
    render(<CategorySelector categories={mockCategories} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Rubro")).toBeInTheDocument();
    expect(screen.getByText("Plomería")).toBeInTheDocument();
    expect(screen.getByText("Electricidad")).toBeInTheDocument();
  });

  it("calls onChange when option changed", () => {
    const onChange = vi.fn();
    render(<CategorySelector categories={mockCategories} onChange={onChange} />);

    const select = screen.getByLabelText("Rubro");
    fireEvent.change(select, { target: { value: "2" } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("displays error message when error prop is provided", () => {
    render(
      <CategorySelector
        categories={mockCategories}
        error="Debe seleccionar un rubro"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Debe seleccionar un rubro")).toBeInTheDocument();
  });
});
