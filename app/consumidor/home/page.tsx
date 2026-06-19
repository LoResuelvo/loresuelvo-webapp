import { getAuthService } from "@/infrastructure/auth";
import ConsumerHome from "@/components/consumer/home/ConsumerHome";
import { getConsumerHome } from "@/application/consumer/get-consumer-home";
import { ApiCategoryRepository } from "@/infrastructure/repositories/api-category-repository";

export default async function ConsumerHomePage() {
  const session = await getAuthService().getSession();

  const categoryRepo = new ApiCategoryRepository();
  const categories = await getConsumerHome(categoryRepo);

  return <ConsumerHome session={session} categories={categories} />;
}

