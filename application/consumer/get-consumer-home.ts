import { CategoryRepository } from "@/ports/category-repository";
import { Category } from "@/domain/shared/types";

export async function getConsumerHome(categoryRepository: CategoryRepository): Promise<Category[]> {
  try {
    return await categoryRepository.getAll();
  } catch (error) {
    console.error("Error fetching categories in use case:", error);
    return [];
  }
}
