import { describe, expect, it, vi } from "vitest";
import { searchProviders } from "./search-providers";
import { CategoryRepository } from "@/ports/category-repository";
import { ProviderRepository } from "@/ports/provider-repository";
import { Category } from "@/domain/shared/types";
import { Provider } from "@/domain/provider/types";

describe("searchProviders", () => {
  const mockCategories: Category[] = [
    { id: 1, name: "Plomería" },
    { id: 2, name: "Electricidad" },
  ];

  const mockProviders: Provider[] = [
    { id: 10, name: "Juan", surname: "Pérez", categoryName: "Plomería" },
  ];

  const mockCategoryRepository = {
    getAll: vi.fn(),
  } as unknown as CategoryRepository;

  const mockProviderRepository = {
    findByCategory: vi.fn(),
  } as unknown as ProviderRepository;

  it("returns providers and selected category successfully", async () => {
    vi.mocked(mockCategoryRepository.getAll).mockResolvedValue(mockCategories);
    vi.mocked(mockProviderRepository.findByCategory).mockResolvedValue(mockProviders);

    const res = await searchProviders(mockCategoryRepository, mockProviderRepository, 1);
    expect(res.providers).toEqual(mockProviders);
    expect(res.selectedCategory).toEqual(mockCategories[0]);
  });

  it("returns empty providers and null category if categoryId is not provided", async () => {
    const res = await searchProviders(mockCategoryRepository, mockProviderRepository);
    expect(res.providers).toEqual([]);
    expect(res.selectedCategory).toBeNull();
  });

  it("handles repository errors and returns default values", async () => {
    vi.mocked(mockCategoryRepository.getAll).mockRejectedValue(new Error("Database offline"));

    const res = await searchProviders(mockCategoryRepository, mockProviderRepository, 1);
    expect(res.providers).toEqual([]);
    expect(res.selectedCategory).toBeNull();
  });
});
