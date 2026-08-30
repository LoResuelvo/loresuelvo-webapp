import { api } from "@/infrastructure/api/base-client";
import { Category } from "@/domain/shared/types";
import { CategoryRepository } from "@/ports/consumer/category-repository";

export class ApiCategoryRepository implements CategoryRepository {
  async getAll(): Promise<Category[]> {
    return api.get<Category[]>("/categories");
  }
}
