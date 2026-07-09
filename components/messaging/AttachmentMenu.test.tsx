import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentMenu } from "./AttachmentMenu";

describe("AttachmentMenu", () => {
  const onAttachImages = vi.fn();
  const onCreateProposal = vi.fn();

  it("renders correctly with trigger button", () => {
    render(
      <AttachmentMenu
        onAttachImages={onAttachImages}
        onCreateProposal={onCreateProposal}
        showProposalOption={true}
      />
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("toggles menu visibility when trigger button is clicked", () => {
    render(
      <AttachmentMenu
        onAttachImages={onAttachImages}
        onCreateProposal={onCreateProposal}
        showProposalOption={true}
      />
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Adjuntar imágenes" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Crear propuesta de servicio" })).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onAttachImages and closes menu when selecting attach option", () => {
    render(
      <AttachmentMenu
        onAttachImages={onAttachImages}
        onCreateProposal={onCreateProposal}
        showProposalOption={true}
      />
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    fireEvent.click(trigger);

    const attachOption = screen.getByRole("menuitem", { name: "Adjuntar imágenes" });
    fireEvent.click(attachOption);

    expect(onAttachImages).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onCreateProposal and closes menu when selecting create proposal option", () => {
    render(
      <AttachmentMenu
        onAttachImages={onAttachImages}
        onCreateProposal={onCreateProposal}
        showProposalOption={true}
      />
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    fireEvent.click(trigger);

    const proposalOption = screen.getByRole("menuitem", { name: "Crear propuesta de servicio" });
    fireEvent.click(proposalOption);

    expect(onCreateProposal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("hides proposal option if showProposalOption is false", () => {
    render(
      <AttachmentMenu
        onAttachImages={onAttachImages}
        onCreateProposal={onCreateProposal}
        showProposalOption={false}
      />
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menuitem", { name: "Adjuntar imágenes" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Crear propuesta de servicio" })).not.toBeInTheDocument();
  });

  it("closes menu when clicking outside", () => {
    render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <AttachmentMenu
          onAttachImages={onAttachImages}
          onCreateProposal={onCreateProposal}
          showProposalOption={true}
        />
      </div>
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps trigger button disabled when disabled prop is true", () => {
    render(
      <AttachmentMenu
        onAttachImages={onAttachImages}
        onCreateProposal={onCreateProposal}
        showProposalOption={true}
        disabled={true}
      />
    );

    const trigger = screen.getByRole("button", { name: "Abrir menú de acciones" });
    expect(trigger).toBeDisabled();
  });
});
