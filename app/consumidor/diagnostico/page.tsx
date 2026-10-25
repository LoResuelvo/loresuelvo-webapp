import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function ConsumerDiagnosisPage() {
  redirect(ROUTES.consumer.aiMessages);
}
