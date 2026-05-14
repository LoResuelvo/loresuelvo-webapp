import { RegisterForm } from "./RegisterForm";
import { RegisterMarketingPanel } from "./RegisterMarketingPanel";

export function RegisterAccountPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4 md:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-xl md:grid-cols-2">
        <RegisterMarketingPanel />

        <section className="flex flex-col gap-4 p-6 md:p-10">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-blue-950">Crea tu cuenta</h1>
            <p className="text-sm text-neutral-600">Completa tus datos para comenzar</p>
          </header>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
