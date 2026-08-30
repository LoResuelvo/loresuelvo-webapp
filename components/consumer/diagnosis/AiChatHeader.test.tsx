import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AiChatHeader } from "./AiChatHeader";
import { t } from "@/infrastructure/i18n/translations";

describe("AiChatHeader", () => {
  it("renders assistant name and avatar", () => {
    render(<AiChatHeader />);
    expect(screen.getByText(t.aiDiagnosis.assistantName)).toBeInTheDocument();
    expect(screen.getByText("IA")).toBeInTheDocument();
  });

  it("renders back button and triggers onBack when provided", () => {
    const handleBack = vi.fn();
    render(<AiChatHeader onBack={handleBack} />);

    const backButton = screen.getByRole("button", { name: t.aiDiagnosis.backToList });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
