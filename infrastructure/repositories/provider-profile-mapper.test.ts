import { describe, expect, it } from "vitest";
import type { ApiProviderProfile } from "@/infrastructure/api/types";
import { mapApiProviderProfileToProvider } from "./provider-profile-mapper";

describe("mapApiProviderProfileToProvider", () => {
  it("maps nested public profile fields to the existing Provider model", () => {
    const apiProfile: ApiProviderProfile = {
      id: 7,
      name: "Juan",
      surname: "Gómez",
      profile_photo: {
        original_name: "juan-gomez.jpg",
        url: "https://example.com/juan-gomez.jpg",
      },
      category: {
        id: 1,
        name: "Plomería",
      },
      rating_average: 4.8,
      rating_count: 12,
      work_orders: [
        {
          id: 10,
          scheduled_on: "2026-08-20T10:00:00Z",
          description: "Reparación de cañería en cocina",
          status: "paid",
          completion_report: {
            description: "Trabajo finalizado correctamente y verificado.",
            reported_on: "2026-08-20T12:00:00Z",
          },
          review: {
            rating: 5,
            description: "Excelente servicio.",
          },
        },
        {
          id: 11,
          scheduled_on: "2026-08-21T10:00:00Z",
          description: "Trabajo no pagado",
          status: "scheduled",
          completion_report: {
            description: "Sin reporte",
            reported_on: "2026-08-21T12:00:00Z",
          },
        },
      ],
    };

    expect(mapApiProviderProfileToProvider(apiProfile)).toEqual({
      id: 7,
      name: "Juan",
      surname: "Gómez",
      categoryName: "Plomería",
      categoryId: 1,
      profilePhotoUrl: "https://example.com/juan-gomez.jpg",
      rating: 4.8,
      reviews: 12,
      workOrders: [
        {
          id: 10,
          scheduledOn: { isoString: "2026-08-20T10:00:00Z" },
          description: "Reparación de cañería en cocina",
          completionReport: {
            description: "Trabajo finalizado correctamente y verificado.",
            reportedOn: { isoString: "2026-08-20T12:00:00Z" },
          },
          review: {
            rating: 5,
            description: "Excelente servicio.",
          },
        },
      ],
    });
  });

  it("maps an external payload to a public model without private work fields", () => {
    // Keep the untrusted API boundary localized so the component only receives the public domain model.
    const externalPayload: unknown = {
      id: 7,
      name: "Juan",
      surname: "Gómez",
      profile_photo: {
        original_name: "juan-gomez.jpg",
        url: "https://example.com/juan-gomez.jpg",
      },
      category: { id: 1, name: "Plomería" },
      rating_average: 4.8,
      rating_count: 12,
      work_orders: [
        {
          id: 10,
          scheduled_on: "2026-08-20T10:00:00Z",
          description: "Reparación de cañería en cocina",
          status: "paid",
          completion_report: {
            description: "Trabajo finalizado correctamente.",
            reported_on: "2026-08-20T12:00:00Z",
            images: [{ file_id: "private-evidence-1", url: "private-evidence.jpg" }],
          },
          consumer: { name: "María López", email: "maria.lopez@example.com" },
          amount_cents: 150000,
        },
      ],
    };
    const apiProfile = externalPayload as ApiProviderProfile;

    const publicProfile = mapApiProviderProfileToProvider(apiProfile);

    expect(publicProfile.workOrders).toEqual([
      {
        id: 10,
        scheduledOn: { isoString: "2026-08-20T10:00:00Z" },
        description: "Reparación de cañería en cocina",
        completionReport: {
          description: "Trabajo finalizado correctamente.",
          reportedOn: { isoString: "2026-08-20T12:00:00Z" },
        },
      },
    ]);
    expect(JSON.stringify(publicProfile)).not.toMatch(
      /María López|maria\.lopez@example\.com|150000|private-evidence/i,
    );
  });
});
