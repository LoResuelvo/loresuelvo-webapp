import Header from "@/components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
      </main>
      <footer className="py-6 text-center text-sm text-gray-500">
        LoResuelvo &copy;2026 Todos los derechos reservados
      </footer>
    </div>
  );
}