import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RoleColumnProps {
  type: "cliente" | "prestador";
  description: string;
  buttonText: string;
  href: string;
}

export function RoleColumn({
  type,
  description,
  buttonText,
  href,
}: RoleColumnProps) {
  const isCliente = type === "cliente";

  return (
    <div className="flex-1 flex flex-col items-start p-6 md:p-8 text-left group">
      <div
        className={`inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[15px] font-bold ${
          isCliente
            ? "bg-brand-primary/5 text-brand-primary"
            : "bg-brand-secondary/10 text-brand-secondary"
        }`}
      >
        Soy {isCliente ? "Cliente" : "Prestador"}
      </div>
      <p className="text-sm sm:text-[15px] text-gray-500 leading-relaxed mt-6 mb-8 min-h-[3.5rem]">
        {description}
      </p>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 text-[15px] font-bold ${
          isCliente
            ? "text-brand-primary group-hover:text-brand-primary/80"
            : "text-brand-secondary group-hover:text-brand-secondary/80"
        } group-hover:gap-2.5 transition-all mt-auto duration-300`}
      >
        {buttonText}{" "}
        <ArrowRight
          size={16}
          className="stroke-[2.5] transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

interface RoleSelectionCardProps {
  clienteDesc: string;
  clienteBtn: string;
  clienteHref: string;
  tecnicoDesc: string;
  tecnicoBtn: string;
  tecnicoHref: string;
}

export default function RoleSelectionCard({
  clienteDesc,
  clienteBtn,
  clienteHref,
  tecnicoDesc,
  tecnicoBtn,
  tecnicoHref,
}: RoleSelectionCardProps) {
  return (
    <div className="w-full max-w-4xl bg-white rounded-[2.25rem] border border-gray-100 shadow-[0_12px_40px_-12px_rgba(26,43,72,0.06)] p-2 sm:p-4 md:p-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 gap-6 md:gap-0 mt-2 relative z-10 transition-transform duration-300 hover:shadow-[0_20px_50px_-15px_rgba(26,43,72,0.09)]">
      <RoleColumn
        type="cliente"
        description={clienteDesc}
        buttonText={clienteBtn}
        href={clienteHref}
      />
      <RoleColumn
        type="prestador"
        description={tecnicoDesc}
        buttonText={tecnicoBtn}
        href={tecnicoHref}
      />
    </div>
  );
}
