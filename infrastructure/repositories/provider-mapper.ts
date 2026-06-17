import { ApiProvider } from "@/infrastructure/api/types";
import { Provider } from "@/domain/provider/types";

export function mapApiToProvider(api: ApiProvider): Provider {
  return {
    id: api.id,
    name: api.name,
    surname: api.surname,
    categoryName: api.category_name,
    categoryId: api.category_id,
    description: api.description,
    rating: api.rating,
    reviews: api.reviews,
    jobs: api.jobs,
    profilePhotoUrl: api.profile_photo_url,
  };
}
