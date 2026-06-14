import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InfoBanner from "@/app/components/messaging/InfoBanner";

describe("InfoBanner", () => {
  it("renderiza el mensaje recibido como children", () => {
    render(<InfoBanner>Hola, soy un aviso</InfoBanner>);
    expect(screen.getByText("Hola, soy un aviso")).toBeInTheDocument();
  });

  it("aplica el estilo info por defecto", () => {
    const { container } = render(<InfoBanner>Aviso</InfoBanner>);
    const banner = container.firstChild as HTMLElement;
    expect(banner.className).toContain("bg-blue-50");
    expect(banner.className).toContain("border-blue-200");
  });

  it("aplica el estilo warning cuando tone es warning", () => {
    const { container } = render(<InfoBanner tone="warning">Aviso</InfoBanner>);
    const banner = container.firstChild as HTMLElement;
    expect(banner.className).toContain("bg-amber-50");
    expect(banner.className).toContain("border-amber-200");
  });

  it("expone el mensaje con role=status para lectores de pantalla", () => {
    render(<InfoBanner>Aviso accesible</InfoBanner>);
    expect(screen.getByRole("status")).toHaveTextContent("Aviso accesible");
  });
});
