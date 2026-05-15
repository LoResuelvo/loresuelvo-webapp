import Link from "next/link";

export default function Header() {
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-gray-200 bg-white px-6 md:px-12 w-full">
      <h1 className="text-[22px] font-medium tracking-tight text-[#002b49]">
        <Link href="/">LoResuelvo</Link>
      </h1>
      <nav className="flex items-center gap-6">
        <Link 
          href="/auth/login" 
          className="text-[15px] font-medium text-gray-900 hover:text-gray-600 transition-colors"
        >
          Iniciar Sesión
        </Link>
        <Link 
          href="/auth/login?screen_hint=signup"
          className="rounded-md bg-[#006699] px-5 py-2 text-[15px] font-medium text-white transition-colors hover:bg-[#005580]"
        >
          Registrarse
        </Link>
      </nav>
    </header>
  );
}
