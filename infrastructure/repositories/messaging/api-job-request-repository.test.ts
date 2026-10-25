import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiJobRequestRepository } from "./api-job-request-repository";
import * as baseClient from "@/infrastructure/api/base-client";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("ApiJobRequestRepository", () => {
  let repository: ApiJobRequestRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiJobRequestRepository();
  });

  describe("accept", () => {
    it("calls POST /job-requests/{id}/accept", async () => {
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await repository.accept(3);

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests/3/accept", null);
    });

    it("sends correct method and endpoint", async () => {
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await repository.accept(123);

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests/123/accept", null);
    });
  });

  describe("create", () => {
    it("sends correct payload including image_file_ids", async () => {
      const mockResponse = {
        id: 1,
        conversation_id: 10,
        title: "Test Title",
        description: "Test Description",
        service_address: { street: "Rivadavia", street_number: "100" },
        created_on: "2026-10-24T09:30:00-03:00",
        images: [
          { id: "img-1", url: "http://example.com/img-1.jpg", original_name: "test.jpg" }
        ]
      };
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await repository.create({
        providerId: 5,
        title: "Test Title",
        description: "Test Description",
        imageFileIds: ["img-1"]
      });

      expect(baseClient.api.post).toHaveBeenCalledWith("/job-requests", {
        provider_id: 5,
        title: "Test Title",
        description: "Test Description",
        image_file_ids: ["img-1"]
      });

      expect(result).toEqual({
        id: 1,
        conversationId: 10,
        title: "Test Title",
        description: "Test Description",
        serviceAddress: { street: "Rivadavia", streetNumber: "100" },
        createdOn: "2026-10-24T09:30:00-03:00",
        images: [
          { id: "img-1", url: "http://example.com/img-1.jpg", originalName: "test.jpg" }
        ]
      });
    });

    it("works without imageFileIds", async () => {
      const mockResponse = {
        id: 1,
        conversation_id: 10,
        title: "Test Title",
        description: "Test Description"
      };
      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await repository.create({
        providerId: 5,
        title: "Test Title",
        description: "Test Description"
      });

      expect(result.images).toEqual([]);
    });
  });

  describe("list", () => {
    it("maps request snapshots and translates images to camelCase", async () => {
      const mockResponse = [
        {
          id: 1,
          conversation_id: 10,
          title: "Test Title",
          description: "Test Description",
          service_address: {
            street: "Av. Siempre Viva",
            street_number: "742",
            floor: "3",
            unit: "B",
          },
          created_on: "2026-10-24T09:30:00-03:00",
          requester: { name: "John", surname: "Doe" },
          images: [
            { id: "img-1", url: "http://example.com/img-1.jpg", original_name: "test.jpg" }
          ]
        }
      ];
      (baseClient.api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await repository.list();

      expect(baseClient.api.get).toHaveBeenCalledWith("/job-requests");
      expect(result).toEqual([
        {
          id: 1,
          conversationId: 10,
          title: "Test Title",
          description: "Test Description",
          serviceAddress: {
            street: "Av. Siempre Viva",
            streetNumber: "742",
            floor: "3",
            unit: "B",
          },
          createdOn: "2026-10-24T09:30:00-03:00",
          requester: { name: "John", surname: "Doe" },
          images: [
            { id: "img-1", url: "http://example.com/img-1.jpg", originalName: "test.jpg" }
          ]
        }
      ]);
    });

    it("keeps legacy requests without a saved address or creation date", async () => {
      (baseClient.api.get as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 2,
          conversation_id: 11,
          title: "Solicitud anterior",
          description: "Sin datos de dirección",
          service_address: null,
          requester: { name: "Ana", surname: "Pérez" },
        },
      ]);

      const result = await repository.list();

      expect(result[0]).toEqual({
        id: 2,
        conversationId: 11,
        title: "Solicitud anterior",
        description: "Sin datos de dirección",
        requester: { name: "Ana", surname: "Pérez" },
        images: [],
      });
    });
  });
});
