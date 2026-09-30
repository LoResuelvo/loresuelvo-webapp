import { t } from "@/infrastructure/i18n/translations";

export default function ActivityLoading() {
  return <p role="status" className="p-6">{t.providerActivity.loading}</p>;
}
