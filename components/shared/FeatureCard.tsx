interface FeatureCardProps {
  title: string;
  description: string;
}

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-50/50 shadow-[0_8px_30px_rgba(26,43,72,0.03)] hover:shadow-[0_15px_35px_rgba(26,43,72,0.06)] transition-all duration-300 flex flex-col items-center text-center">
      <h4 className="text-lg font-bold text-brand-primary mb-3.5">
        {title}
      </h4>
      <p className="text-[14px] text-gray-500 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}
