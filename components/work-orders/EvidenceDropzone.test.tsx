import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { EvidenceDropzone } from "./EvidenceDropzone";
import { t } from "@/infrastructure/i18n/translations";

describe("EvidenceDropzone", () => {
  it("renders upload button and hidden file input", () => {
    const fileInputRef = React.createRef<HTMLInputElement>();
    const onFileChange = vi.fn();

    render(
      <EvidenceDropzone
        fileInputRef={fileInputRef}
        onFileChange={onFileChange}
      />
    );

    expect(
      screen.getByRole("button", { name: new RegExp(t.workOrderCompletion.uploadButtonText, "i") })
    ).toBeInTheDocument();
    expect(screen.getByTestId("completion-file-input")).toBeInTheDocument();
  });

  it("hides upload button when hidden is true", () => {
    const fileInputRef = React.createRef<HTMLInputElement>();
    const onFileChange = vi.fn();

    render(
      <EvidenceDropzone
        fileInputRef={fileInputRef}
        onFileChange={onFileChange}
        hidden={true}
      />
    );

    expect(
      screen.queryByRole("button", { name: new RegExp(t.workOrderCompletion.uploadButtonText, "i") })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("completion-file-input")).toBeInTheDocument();
  });

  it("triggers file input on button click", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const fileInputRef = React.createRef<HTMLInputElement>();
    const onFileChange = vi.fn();

    render(
      <EvidenceDropzone
        fileInputRef={fileInputRef}
        onFileChange={onFileChange}
      />
    );

    const button = screen.getByRole("button", { name: new RegExp(t.workOrderCompletion.uploadButtonText, "i") });
    await user.click(button);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
