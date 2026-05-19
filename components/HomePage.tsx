import HeroContent from "@/components/HeroContent";
import RegistrationCard from "@/components/RegistrationCard";
import { ROUTES } from "@/lib/routes";
import { PageLayout } from "@/components/PageLayout";
import { Container } from "@/components/Container";

export default function HomePage() {
  return (
    <PageLayout>
      <Container className="py-12 md:py-24 flex flex-col lg:flex-row items-center gap-16">
        <HeroContent />

        <div className="flex-1 w-full flex flex-col sm:flex-row gap-6">
          <RegistrationCard
            title="Registrarme como Cliente"
            description="Necesito ayuda profesional en mi hogar."
            buttonText="Ser Cliente"
            buttonClass="bg-brand-primary text-white hover:bg-brand-primary/90"
            href={ROUTES.auth.signup}
          />
          <RegistrationCard
            title="Registrarme como Técnico"
            description="Quiero ofrecer mis servicios y crecer mi negocio."
            buttonText="Ser Técnico"
            buttonClass="border border-gray-200 bg-white text-brand-primary hover:bg-gray-50"
            href={ROUTES.auth.signup}
          />
        </div>
      </Container>
    </PageLayout>
  );
}