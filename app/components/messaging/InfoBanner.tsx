import { ReactNode } from "react";
import { Info as InfoIcon, AlertTriangle } from "lucide-react";

type InfoBannerTone = "info" | "warning";

interface InfoBannerProps {
  children: ReactNode;
  tone?: InfoBannerTone;
}

const TONE_STYLES: Record<InfoBannerTone, { container: string; text: string; icon: string }> = {
  info: {
    container: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    icon: "text-blue-500",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-600",
  },
};

export default function InfoBanner({ children, tone = "info" }: InfoBannerProps) {
  const styles = TONE_STYLES[tone];
  const Icon = tone === "warning" ? AlertTriangle : InfoIcon;

  return (
    <div
      role="status"
      className={`${styles.container} border rounded-xl p-4 flex items-start gap-3`}
    >
      <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} aria-hidden="true" />
      <p className={`${styles.text} text-[14px]`}>{children}</p>
    </div>
  );
}
