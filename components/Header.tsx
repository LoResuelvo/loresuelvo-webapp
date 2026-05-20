import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/Container";
import { AppUser } from "@/lib/auth/types";

interface HeaderProps {
  user?: AppUser | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-20 items-center border-b border-gray-100 bg-brand-neutral w-full">
      <Container className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-tight text-brand-primary">
          <Link href={ROUTES.home}>LoResuelvo</Link>
        </h1>
        <nav className="flex items-center">
          {user ? (
            <>
              <span className="text-[14px] font-medium text-brand-primary">
                Hola, {user.firstName}
              </span>
            </>
          ) : (
            <Link
              href={ROUTES.auth.login}
              className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-[14px] font-medium text-brand-primary shadow-sm hover:bg-gray-50 transition-colors"
            >
              Iniciar Sesión
            </Link>
          )}
        </nav>
      </Container>
    </header>
  );
}
