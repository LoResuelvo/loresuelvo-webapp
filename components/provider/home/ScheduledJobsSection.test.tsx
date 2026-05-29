import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScheduledJobsSection from "./ScheduledJobsSection";
import { ProviderScheduledJob } from "@/lib/provider-home/types";

const mockScheduledJobs: ProviderScheduledJob[] = [
  {
    id: "job-1",
    jobTitle: "Reparación de grifería",
    clientName: "Carlos Méndez",
    scheduledAtLabel: "Mañana, 10:00",
    location: "Belgrano, CABA",
    priceLabel: "$45.000",
  },
  {
    id: "job-2",
    jobTitle: "Instalación de aire acondicionado",
    clientName: "Laura Pérez",
    scheduledAtLabel: "Viernes, 14:30",
    location: "Palermo, CABA",
    priceLabel: "$80.000",
  },
];

describe("ScheduledJobsSection", () => {
  it("shows empty state message when there are no scheduled jobs", () => {
    render(<ScheduledJobsSection jobs={[]} />);

    const section = screen.getByRole("region", { name: "Trabajos Agendados" });
    expect(within(section).getByText("No tienes trabajos agendados")).toBeInTheDocument();
  });

  it("renders scheduled jobs with the expected details", () => {
    render(<ScheduledJobsSection jobs={mockScheduledJobs} />);

    const section = screen.getByRole("region", { name: "Trabajos Agendados" });
    const list = within(section).getByRole("list", { name: "Lista de trabajos agendados" });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);

    const firstJob = items[0];
    expect(within(firstJob).getByText("Reparación de grifería")).toBeInTheDocument();
    expect(within(firstJob).getByText("Carlos Méndez")).toBeInTheDocument();
    expect(within(firstJob).getByText("Mañana, 10:00")).toBeInTheDocument();
    expect(within(firstJob).getByText("Belgrano, CABA")).toBeInTheDocument();
    expect(within(firstJob).getByText("$45.000")).toBeInTheDocument();
  });
});