import { CategoryRepository } from "@/ports/consumer/category-repository";
import { Category } from "@/domain/shared/types";
import { logger } from "@/infrastructure/logging/logger";

export async function getConsumerHome(categoryRepository: CategoryRepository): Promise<Category[]> {
  try {
    return await categoryRepository.getAll();
  } catch (error) {
    logger.debug("[getConsumerHome] Failed to fetch categories:", { error });
    return [];
  }
}
