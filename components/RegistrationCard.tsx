import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface RegistrationCardProps {
  title: string;
  description: string;
  buttonText: string;
  buttonClass: string;
  href: string;
}

export default function RegistrationCard({
  title,
  description,
  buttonText,
  buttonClass,
  href,
}: RegistrationCardProps) {
  return (
    <div className="flex-1 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full ">
      <h3 className="text-xl font-bold text-[#1A2B48] mb-3">{title}</h3>
      <p className="text-gray-500 mb-8 flex-1">
        {description}
      </p>
      <Link 
        href={href} 
        className={`mt-auto w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${buttonClass} transition-transform hover:-translate-y-1`}
      >
        {buttonText} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
