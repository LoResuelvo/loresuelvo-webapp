import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatClaimReferenceLabel, ClaimReferenceSummary } from "./ClaimReferenceSummary";
import type { ClaimReferenceOption } from "@/domain/claim/types";

describe("formatClaimReferenceLabel", () => {
  it("formats short labels without truncating", () => {
    const option: ClaimReferenceOption = {
      value: "job_request:47",
      reference: { kind: "job_request", id: 47 },
      context: {
        title: "Reparación de cañería",
        description: "Pérdida de agua continua bajo bacha",
        person: "Ana Pérez",
        personRole: "requester",
      },
    };

    const label = formatClaimReferenceLabel(option);
    expect(label).toBe(
      "Solicitud: Reparación de cañería · Pérdida de agua continua bajo bacha · Solicitante: Ana Pérez · Referencia #47",
    );
  });

  it("truncates long descriptions exceeding 40 characters with ellipsis", () => {
    const option: ClaimReferenceOption = {
      value: "job_request:37",
      reference: { kind: "job_request", id: 37 },
      context: {
        title: "Revisión de luces del balcón",
        description: "Necesito revisar la instalación y coordinar una visita para resolver la falla.",
        person: "Diego Molina",
        personRole: "requester",
      },
    };

    const label = formatClaimReferenceLabel(option);
    expect(label).toContain("Revisión de luces del balcón");
    expect(label).toContain("Necesito revisar la instalación y coordi…");
    expect(label).toContain("Solicitante: Diego Molina");
    expect(label).toContain("Referencia #37");
    expect(label).not.toContain("resolver la falla.");
  });

  it("truncates long titles and person names if they exceed limits", () => {
    const option: ClaimReferenceOption = {
      value: "service_proposal:10",
      reference: { kind: "service_proposal", id: 10 },
      context: {
        title: "Este es un título excesivamente largo que sobrepasa los cincuenta caracteres permitidos para el selector",
        person: "Nombre De Usuario Sumamente Largo Que Supera El Límite",
      },
    };

    const label = formatClaimReferenceLabel(option);
    expect(label).toContain("Este es un título excesivamente largo que sobrepas…");
    expect(label).toContain("Persona vinculada: Nombre De Usuario Sumamente La…");
  });
});

describe("ClaimReferenceSummary component", () => {
  it("renders full context details without truncating in the card", () => {
    const option: ClaimReferenceOption = {
      value: "job_request:37",
      reference: { kind: "job_request", id: 37 },
      context: {
        title: "Revisión de luces del balcón",
        description: "Necesito revisar la instalación y coordinar una visita para resolver la falla.",
        person: "Diego Molina",
        personRole: "requester",
      },
    };

    render(<ClaimReferenceSummary option={option} />);

    expect(screen.getByText("Revisión de luces del balcón")).toBeInTheDocument();
    expect(screen.getByText("Necesito revisar la instalación y coordinar una visita para resolver la falla.")).toBeInTheDocument();
    expect(screen.getByText("Diego Molina")).toBeInTheDocument();
    expect(screen.getByText("Solicitud · Referencia #37")).toBeInTheDocument();
  });
});
