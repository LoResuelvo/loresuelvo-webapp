import { describe, expect, it, vi } from "vitest";
import { getConsumerHome } from "./get-consumer-home";
import { CategoryRepository } from "@/ports/category-repository";

describe("getConsumerHome", () => {
  const mockCategories = [{ id: 1, name: "Plomería" }];
  const mockCategoryRepository = {
    getAll: vi.fn(),
  } as unknown as CategoryRepository;

  it("gets categories from the repository successfully", async () => {
    vi.mocked(mockCategoryRepository.getAll).mockResolvedValue(mockCategories);

    const res = await getConsumerHome(mockCategoryRepository);
    expect(res).toEqual(mockCategories);
    expect(mockCategoryRepository.getAll).toHaveBeenCalled();
  });

  it("returns an empty array if the repository fails", async () => {
    vi.mocked(mockCategoryRepository.getAll).mockRejectedValue(new Error("Database error"));

    const res = await getConsumerHome(mockCategoryRepository);
    expect(res).toEqual([]);
  });
});
