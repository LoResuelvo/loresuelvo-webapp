import { beforeEach, describe, expect, it, vi } from "vitest";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiUserRepository } from "./api-user-repository";
import type { ProviderCurrentUser } from "@/domain/user/types";

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
        "photo-uuid-456",
        {
          street: "Av. Rivadavia",
          streetNumber: "5100",
        }
      );

      expect(baseClient.api.post).toHaveBeenCalledWith("/consumers", {
        email: "ana@example.com",
        name: "Ana",
        surname: "Pérez",
        address: {
          street: "Av. Rivadavia",
          street_number: "5100",
        },
        profile_photo_file_id: "photo-uuid-456",
      });
      expect(result).toEqual({ profilePhotoUrl: "https://example.com/consumer-photo.jpg" });
    });

    it("maps optional floor and unit fields to the API address payload", async () => {
      vi.mocked(baseClient.api.post).mockResolvedValue({});

      const repository = new ApiUserRepository();
      await repository.registerConsumer(
        {
          email: "ana@example.com",
          name: "Ana",
          surname: "Pérez",
        },
        undefined,
        {
          street: "Av. Rivadavia",
          streetNumber: "5100",
          floor: "4",
          unit: "B",
        }
      );

      expect(baseClient.api.post).toHaveBeenCalledWith("/consumers", {
        email: "ana@example.com",
        name: "Ana",
        surname: "Pérez",
        address: {
          street: "Av. Rivadavia",
          street_number: "5100",
          floor: "4",
          unit: "B",
        },
      });
    });
  });

  describe("getCurrentUser", () => {
    it("fetches current user and maps to domain", async () => {
      vi.mocked(baseClient.api.get).mockResolvedValue({
        id: 2,
        email: "user@example.com",
        name: "Carlos",
        surname: "López",
        role: "provider",
        calendar_connection_status: "disconnected",
        profile_photo: null,
        category: { id: 1, name: "Plomería" },
        identity_verification_status: "unverified",
        identity_verified_on: null,
      });

      const repository = new ApiUserRepository();
      const result = await repository.getCurrentUser();

      expect(baseClient.api.get).toHaveBeenCalledWith("/me");
      expect(result.id).toBe(2);
      expect(result.email).toBe("user@example.com");
      expect(result.role).toBe("provider");
      expect((result as ProviderCurrentUser).identityVerificationStatus).toBe("unverified");
    });
  });
});
