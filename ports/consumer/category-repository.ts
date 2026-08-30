import { Category } from "@/domain/shared/types";

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
}
