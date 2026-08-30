import { ApiProviderProfile } from "@/infrastructure/api/types";
import { ProviderProfile } from "@/domain/provider/types";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";

export function mapApiProviderProfileToProvider(apiProfile: ApiProviderProfile): ProviderProfile {
  return {
    id: apiProfile.id,
    name: apiProfile.name,
    surname: apiProfile.surname,
    categoryName: apiProfile.category.name,
    categoryId: apiProfile.category.id,
    profilePhotoUrl: apiProfile.profile_photo.url,
    rating: apiProfile.rating_average,
    reviews: apiProfile.rating_count,
    workOrders: apiProfile.work_orders
      .filter((workOrder) => workOrder.status === "paid")
      .map((workOrder) => ({
        id: workOrder.id,
        scheduledOn: ScheduledDateTime.create(workOrder.scheduled_on),
        description: workOrder.description,
        completionReport: {
          description: workOrder.completion_report.description,
          reportedOn: ScheduledDateTime.create(workOrder.completion_report.reported_on),
        },
        ...(workOrder.review
          ? {
              review: {
                rating: workOrder.review.rating,
                description: workOrder.review.description,
              },
            }
          : {}),
      })),
  };
}
