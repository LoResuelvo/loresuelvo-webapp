import Header from "@/components/Header";
import HeroContent from "@/components/HeroContent";
import RegistrationCard from "@/components/RegistrationCard";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col lg:flex-row items-center gap-16">
        
        <HeroContent />

        <div className="flex-1 w-full flex flex-col sm:flex-row gap-6">
          <RegistrationCard
            title="Registrarme como Cliente"
            description="Necesito ayuda profesional en mi hogar."
            buttonText="Ser Cliente"
            buttonClass="bg-[#0F1C35] text-white hover:bg-[#1A2B48]"
            href="/auth/login?screen_hint=signup"
          />
          <RegistrationCard
            title="Registrarme como Técnico"
            description="Quiero ofrecer mis servicios y crecer mi negocio."
            buttonText="Ser Técnico"
            buttonClass="border border-gray-200 bg-white text-[#1A2B48] hover:bg-gray-50"
            href="/auth/login?screen_hint=signup"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}