import { beforeEach, describe, expect, it, vi } from "vitest";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiUserRepository } from "./api-user-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ApiUserRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerProvider", () => {
    it("posts provider data with coverage zone ids and returns profile photo url", async () => {
      vi.mocked(baseClient.api.post).mockResolvedValue({
        profile_photo_url: "https://example.com/provider-photo.jpg",
      });

      const repository = new ApiUserRepository();
      const result = await repository.registerProvider(
        {
          email: "carlos@example.com",
          name: "Carlos",
          surname: "López",
        },
        1,
        "photo-uuid-123",
        [6, 14]
      );

      expect(baseClient.api.post).toHaveBeenCalledWith("/providers", {
        email: "carlos@example.com",
        name: "Carlos",
        surname: "López",
        category_id: 1,
        profile_photo_file_id: "photo-uuid-123",
        coverage_zone_ids: [6, 14],
      });
      expect(result).toEqual({ profilePhotoUrl: "https://example.com/provider-photo.jpg" });
    });

    it("defaults coverage_zone_ids to empty array if not provided", async () => {
      vi.mocked(baseClient.api.post).mockResolvedValue({});

      const repository = new ApiUserRepository();
      const result = await repository.registerProvider(
        {
          email: "carlos@example.com",
          name: "Carlos",
          surname: "López",
        },
        2
      );

      expect(baseClient.api.post).toHaveBeenCalledWith("/providers", {
        email: "carlos@example.com",
        name: "Carlos",
        surname: "López",
        category_id: 2,
        profile_photo_file_id: undefined,
        coverage_zone_ids: [],
      });
      expect(result).toEqual({ profilePhotoUrl: undefined });
    });
  });

  describe("registerConsumer", () => {
    it("posts consumer data with photo id if provided", async () => {
      vi.mocked(baseClient.api.post).mockResolvedValue({
        profile_photo_url: "https://example.com/consumer-photo.jpg",
      });

      const repository = new ApiUserRepository();
      const result = await repository.registerConsumer(
        {
          email: "ana@example.com",
          name: "Ana",
          surname: "Pérez",
        },
        "photo-uuid-456"
      );

      expect(baseClient.api.post).toHaveBeenCalledWith("/consumers", {
        email: "ana@example.com",
        name: "Ana",
        surname: "Pérez",
        address: {
          street: "Av. Rivadavia",
          street_number: "1234",
        },
        profile_photo_file_id: "photo-uuid-456",
      });
      expect(result).toEqual({ profilePhotoUrl: "https://example.com/consumer-photo.jpg" });
    });
  });

  describe("getCurrentUser", () => {
    it("fetches current user and maps to domain", async () => {
      vi.mocked(baseClient.api.get).mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
        first_name: "Carlos",
        last_name: "López",
        role: "provider",
        category: { id: 1, name: "Plomería" },
        profile_photo_url: "https://example.com/photo.jpg",
      });

      const repository = new ApiUserRepository();
      const result = await repository.getCurrentUser();

      expect(baseClient.api.get).toHaveBeenCalledWith("/me");
      expect(result.id).toBe("user-123");
      expect(result.email).toBe("user@example.com");
    });
  });
});
