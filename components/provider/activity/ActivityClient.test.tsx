import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityClient } from "./ActivityClient";
import { getProviderActivityAction, type ActivityActionResult } from "@/app/prestador/mi-desempeno/actividad/actions";
import { mapProviderActivity } from "@/infrastructure/repositories/provider/activity-mapper";
import { anActivityResponse, aWeeklyActivityResponse, aComparedActivityResponse } from "@/features/support/activity-factory";

vi.mock("@/app/prestador/mi-desempeno/actividad/actions", () => ({ getProviderActivityAction: vi.fn() }));

describe("activity interaction", () => {
  beforeEach(() => vi.clearAllMocks());
  it("retries the failed filter without presenting the error as zero activity", async () => {
    vi.mocked(getProviderActivityAction)
      .mockResolvedValueOnce({ success: false, error: "No pudimos consultar tu actividad." })
      .mockResolvedValueOnce({ success: true, data: mapProviderActivity(aWeeklyActivityResponse()) });
    render(<ActivityClient initialResult={{ success: true, data: mapProviderActivity(anActivityResponse()) }} />);
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-04" } });
    fireEvent.change(screen.getByLabelText("Hasta (incluido)"), { target: { value: "2026-08-12" } });
    fireEvent.change(screen.getByLabelText("Agrupación"), { target: { value: "week" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos consultar");
    expect(screen.queryByRole("region", { name: "Resultados del período" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar consulta" }));
    expect(await screen.findByTestId("activity-period")).toHaveTextContent("4/8/26");
    expect(vi.mocked(getProviderActivityAction).mock.calls[1]).toEqual(vi.mocked(getProviderActivityAction).mock.calls[0]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("allows retrying an initial failure and disables retry while pending", async () => {
    let finish: ((result: ActivityActionResult) => void) | undefined;
    vi.mocked(getProviderActivityAction).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<ActivityClient initialResult={{ success: false, error: "No pudimos consultar tu actividad." }} />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar consulta" }));
    expect(getProviderActivityAction).toHaveBeenCalledWith(undefined);
    expect(screen.getByRole("button", { name: "Reintentar consulta" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Consultando actividad");
    await act(async () => { finish?.({ success: true, data: mapProviderActivity(anActivityResponse()) }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("keeps draft filters separate, announces loading and applies only returned results", async () => {
    let finish: ((result: ActivityActionResult) => void) | undefined;
    vi.mocked(getProviderActivityAction).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<ActivityClient initialResult={{ success: true, data: mapProviderActivity(anActivityResponse()) }} />);
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-04" } });
    fireEvent.change(screen.getByLabelText("Hasta (incluido)"), { target: { value: "2026-08-12" } });
    fireEvent.change(screen.getByLabelText("Agrupación"), { target: { value: "week" } });
    expect(getProviderActivityAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getByRole("status")).toHaveTextContent("Consultando actividad");
    expect(screen.getByRole("button", { name: "Aplicar filtros" })).toBeDisabled();
    expect(getProviderActivityAction).toHaveBeenCalledWith({ from: "2026-08-04T00:00:00-03:00", to: "2026-08-13T00:00:00-03:00", granularity: "week" });
    await act(async () => { finish?.({ success: true, data: mapProviderActivity(aWeeklyActivityResponse()) }); });
    await waitFor(() => expect(screen.getByTestId("activity-period")).toHaveTextContent("4/8/26"));
  });
  it("fixes comparison to the exact effective period and displays unavailable percentages", async () => {
    vi.mocked(getProviderActivityAction).mockResolvedValue({ success: true, data: mapProviderActivity(aComparedActivityResponse()) });
    render(<ActivityClient initialResult={{ success: true, data: mapProviderActivity(anActivityResponse()) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Comparar con el período anterior" }));
    expect(getProviderActivityAction).toHaveBeenCalledWith({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", comparePrevious: true });
    const table = await screen.findByRole("table", { name: "Comparación con el período anterior" });
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("No disponible");
    expect(within(table).getAllByRole("row")[1]).not.toHaveTextContent("%");
    vi.mocked(getProviderActivityAction).mockResolvedValue({ success: true, data: mapProviderActivity(anActivityResponse()) });
    fireEvent.click(screen.getByRole("button", { name: "Desactivar comparación" }));
    expect(getProviderActivityAction).toHaveBeenLastCalledWith({ from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", granularity: "day", comparePrevious: false });
    await waitFor(() => expect(screen.queryByRole("table", { name: "Comparación con el período anterior" })).not.toBeInTheDocument());
  });
  it("preserves exact bounds when only changing grouping", () => {
    const response = anActivityResponse();
    response.period.from = "2026-08-01T12:34:56-03:00";
    response.period.to = "2026-08-31T12:34:56-03:00";
    response.evolution[0].from = response.period.from;
    response.evolution[response.evolution.length - 1].to = response.period.to;
    vi.mocked(getProviderActivityAction).mockReturnValue(new Promise(() => {}));
    render(<ActivityClient initialResult={{ success: true, data: mapProviderActivity(response) }} />);
    fireEvent.change(screen.getByLabelText("Agrupación"), { target: { value: "month" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(getProviderActivityAction).toHaveBeenCalledWith({ from: response.period.from, to: response.period.to, granularity: "month" });
  });
});
