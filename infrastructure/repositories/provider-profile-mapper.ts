import { ApiProviderProfile } from "@/infrastructure/api/types";
import { Provider } from "@/domain/provider/types";

export function mapApiProviderProfileToProvider(apiProfile: ApiProviderProfile): Provider {
  return {
    id: apiProfile.id,
    name: apiProfile.name,
    surname: apiProfile.surname,
    categoryName: apiProfile.category.name,
    categoryId: apiProfile.category.id,
    profilePhotoUrl: apiProfile.profile_photo.url,
    rating: apiProfile.rating_average,
    reviews: apiProfile.rating_count,
  };
}
