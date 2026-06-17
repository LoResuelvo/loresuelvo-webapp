import { Card } from "@/components/ui/card";

interface FeatureCardProps {
  title: string;
  description: string;
}

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <Card variant="interactive" size="none" className="p-8 border border-gray-50/50 flex flex-col items-center text-center">
      <h4 className="text-lg font-bold text-brand-primary mb-3.5">
        {title}
      </h4>
      <p className="text-[14px] text-gray-500 leading-relaxed font-medium">
        {description}
      </p>
    </Card>
  );
}
