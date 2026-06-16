import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/shared/Container";
import { AppUser } from "@/infrastructure/auth/types";

interface HeaderProps {
  user?: AppUser | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-20 items-center border-b border-transparent bg-transparent w-full relative z-50">
      <Container className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-tight text-brand-primary">
          <Link href={ROUTES.home} className="hover:opacity-90 transition-opacity">LoResuelvo</Link>
        </h1>
        <nav className="flex items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-medium text-brand-primary">
                Hola, {user.firstName}
              </span>
              <Link
                href={ROUTES.auth.logout}
                className="rounded-full bg-slate-100/80 hover:bg-slate-200/80 px-5 py-2.5 text-[14px] font-semibold text-brand-primary transition-all duration-200"
              >
                Cerrar sesión
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href={ROUTES.auth.login}
                className="rounded-full bg-brand-primary/5 hover:bg-brand-primary/10 px-6 py-2.5 text-[14px] font-semibold text-brand-primary transition-all duration-200"
              >
                Iniciar Sesión
              </Link>
              <Link
                href={ROUTES.auth.signup}
                className="rounded-full bg-brand-primary text-white hover:bg-brand-primary/90 px-6 py-2.5 text-[14px] font-semibold transition-all duration-200 shadow-[0_4px_12px_rgba(26,43,72,0.12)]"
              >
                Registrarse
              </Link>
            </div>
          )}
        </nav>
      </Container>
    </header>
  );
}
