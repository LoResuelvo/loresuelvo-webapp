import { describe, expect, it, vi } from "vitest";
import type { CategoryRepository } from "@/ports/consumer/category-repository";
import type { ProviderRepository } from "@/ports/consumer/provider-repository";
import type { Category } from "@/domain/shared/types";
import type { Provider } from "@/domain/provider/types";
import { searchProviders } from "./search-providers";

const categories: Category[] = [
  { id: 1, name: "Plomería" },
  { id: 2, name: "Electricidad" },
];

const providers: Provider[] = [
  {
    id: 10,
    name: "Juan",
    surname: "Pérez",
    identityVerified: false,
    categoryName: "Plomería",
  },
  {
    id: 11,
    name: "Ana",
    surname: "Gómez",
    identityVerified: true,
    categoryName: "Plomería",
  },
];

function createRepositoryMocks() {
  const getAll = vi.fn<CategoryRepository["getAll"]>();
  const findByCategory = vi.fn<ProviderRepository["findByCategory"]>();

  return {
    categoryRepository: { getAll },
    providerRepository: { findByCategory },
  };
}

describe("searchProviders", () => {
  it("starts provider lookup before the category catalog resolves", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    let resolveCategories!: (value: Category[]) => void;
    const categoriesPromise = new Promise<Category[]>(resolve => {
      resolveCategories = resolve;
    });
    categoryRepository.getAll.mockReturnValueOnce(categoriesPromise);
    providerRepository.findByCategory.mockResolvedValueOnce(providers);

    const resultPromise = searchProviders(categoryRepository, providerRepository, 2);

    expect(providerRepository.findByCategory).toHaveBeenCalledWith(2);

    resolveCategories(categories);
    await expect(resultPromise).resolves.toEqual({
      providers,
      selectedCategory: categories[1],
    });
  });

  it("returns providers in repository order and selects the matching category", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    categoryRepository.getAll.mockResolvedValueOnce(categories);
    providerRepository.findByCategory.mockResolvedValueOnce(providers);

    const result = await searchProviders(categoryRepository, providerRepository, 2);

    expect(result).toEqual({ providers, selectedCategory: categories[1] });
    expect(categoryRepository.getAll).toHaveBeenCalledTimes(1);
    expect(categoryRepository.getAll).toHaveBeenCalledWith();
    expect(providerRepository.findByCategory).toHaveBeenCalledTimes(1);
    expect(providerRepository.findByCategory).toHaveBeenCalledWith(2);
  });

  it.each([
    { label: "undefined", categoryId: undefined },
    { label: "zero", categoryId: 0 },
    { label: "NaN", categoryId: Number.NaN },
  ])("returns an empty result without repository calls for $label category IDs", async ({ categoryId }) => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();

    const result = await searchProviders(categoryRepository, providerRepository, categoryId);

    expect(result).toEqual({ providers: [], selectedCategory: null });
    expect(categoryRepository.getAll).not.toHaveBeenCalled();
    expect(providerRepository.findByCategory).not.toHaveBeenCalled();
  });

  it.each([
    { label: "an empty catalog", catalog: [], categoryId: 1 },
    { label: "an unknown category", catalog: categories, categoryId: 99 },
  ])("still looks up providers with $label", async ({ catalog, categoryId }) => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    categoryRepository.getAll.mockResolvedValueOnce(catalog);
    providerRepository.findByCategory.mockResolvedValueOnce(providers);

    const result = await searchProviders(categoryRepository, providerRepository, categoryId);

    expect(result).toEqual({ providers, selectedCategory: null });
    expect(categoryRepository.getAll).toHaveBeenCalledTimes(1);
    expect(providerRepository.findByCategory).toHaveBeenCalledTimes(1);
    expect(providerRepository.findByCategory).toHaveBeenCalledWith(categoryId);
  });

  it("keeps the matching category when no providers are found", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    categoryRepository.getAll.mockResolvedValueOnce(categories);
    providerRepository.findByCategory.mockResolvedValueOnce([]);

    const result = await searchProviders(categoryRepository, providerRepository, 1);

    expect(result).toEqual({ providers: [], selectedCategory: categories[0] });
  });

  it("propagates a category repository error", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    const error = new Error("Categories unavailable");
    categoryRepository.getAll.mockRejectedValueOnce(error);

    await expect(searchProviders(categoryRepository, providerRepository, 1)).rejects.toBe(error);
    expect(categoryRepository.getAll).toHaveBeenCalledTimes(1);
  });

  it("starts provider lookup even when the category lookup rejects", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    const error = new Error("Categories unavailable");
    categoryRepository.getAll.mockRejectedValueOnce(error);
    providerRepository.findByCategory.mockResolvedValueOnce(providers);

    await expect(searchProviders(categoryRepository, providerRepository, 1)).rejects.toBe(error);

    expect(providerRepository.findByCategory).toHaveBeenCalledWith(1);
  });

  it("propagates either original error when both repository reads reject", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    const categoryError = new Error("Categories unavailable");
    const providerError = new Error("Providers unavailable");
    categoryRepository.getAll.mockRejectedValueOnce(categoryError);
    providerRepository.findByCategory.mockRejectedValueOnce(providerError);

    const rejection = await searchProviders(categoryRepository, providerRepository, 1).then(
      () => undefined,
      error => error
    );

    expect([categoryError, providerError]).toContain(rejection);
    expect(categoryRepository.getAll).toHaveBeenCalledTimes(1);
    expect(providerRepository.findByCategory).toHaveBeenCalledWith(1);
  });

  it("propagates a provider repository error", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    const error = new Error("Providers unavailable");
    categoryRepository.getAll.mockResolvedValueOnce(categories);
    providerRepository.findByCategory.mockRejectedValueOnce(error);

    await expect(searchProviders(categoryRepository, providerRepository, 1)).rejects.toBe(error);
    expect(providerRepository.findByCategory).toHaveBeenCalledWith(1);
  });

  it("keeps results independent across invocations", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    categoryRepository.getAll.mockResolvedValue(categories);
    providerRepository.findByCategory
      .mockResolvedValueOnce([providers[0]])
      .mockResolvedValueOnce([providers[1]]);

    const results = await Promise.all([
      searchProviders(categoryRepository, providerRepository, 1),
      searchProviders(categoryRepository, providerRepository, 2),
    ]);

    expect(results.map(result => result.providers)).toEqual([[providers[0]], [providers[1]]]);
    expect(results.map(result => result.selectedCategory)).toEqual([categories[0], categories[1]]);
    expect(providerRepository.findByCategory).toHaveBeenNthCalledWith(1, 1);
    expect(providerRepository.findByCategory).toHaveBeenNthCalledWith(2, 2);
  });

  it("keeps concurrent results independent when provider lookups resolve out of order", async () => {
    const { categoryRepository, providerRepository } = createRepositoryMocks();
    let resolveFirst!: (value: Provider[]) => void;
    let resolveSecond!: (value: Provider[]) => void;
    const firstProviders = new Promise<Provider[]>(resolve => {
      resolveFirst = resolve;
    });
    const secondProviders = new Promise<Provider[]>(resolve => {
      resolveSecond = resolve;
    });
    categoryRepository.getAll.mockResolvedValue(categories);
    providerRepository.findByCategory
      .mockReturnValueOnce(firstProviders)
      .mockReturnValueOnce(secondProviders);

    const firstResult = searchProviders(categoryRepository, providerRepository, 1);
    const secondResult = searchProviders(categoryRepository, providerRepository, 2);

    resolveSecond([providers[1]]);
    await expect(secondResult).resolves.toEqual({
      providers: [providers[1]],
      selectedCategory: categories[1],
    });
    resolveFirst([providers[0]]);
    await expect(firstResult).resolves.toEqual({
      providers: [providers[0]],
      selectedCategory: categories[0],
    });
  });
});
