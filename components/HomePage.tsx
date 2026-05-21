import HeroContent from "@/components/HeroContent";
import { PageLayout } from "@/components/PageLayout";
import { Container } from "@/components/Container";
import { ROUTES } from "@/lib/routes";
import { AmbientGlows } from "@/components/ui/AmbientGlows";
import RoleSelectionCard from "@/components/RoleSelectionCard";
import { FeatureCard } from "@/components/FeatureCard";

export default function HomePage() {
  return (
    <PageLayout>
      <div className="relative w-full flex-1 flex flex-col bg-[#FAF9F6] overflow-hidden -mt-20 pt-20">
        <AmbientGlows />

        <Container className="py-12 md:py-16 flex flex-col items-center gap-12 relative z-10">
          <HeroContent />

          <RoleSelectionCard
            clienteDesc="Busco ayuda profesional certificada para resolver problemas y mantenimiento en mi hogar con facilidad y seguridad."
            clienteBtn="Encontrar un profesional"
            clienteHref={ROUTES.auth.signup}
            tecnicoDesc="Quiero ofrecer mis servicios especializados, gestionar mis trabajos y hacer crecer mi negocio con el respaldo de LoResuelvo."
            tecnicoBtn="Unirme como profesional"
            tecnicoHref={ROUTES.auth.signup}
          />

          <div className="w-full flex flex-col items-center text-center mt-20 mb-6 relative z-10">
            <h3 className="text-3xl sm:text-[34px] font-extrabold text-brand-primary tracking-tight">
              ¿Por qué elegir LoResuelvo?
            </h3>
            <p className="text-sm sm:text-base md:text-[17px] text-gray-500 max-w-2xl leading-relaxed mt-3.5 font-medium">
              Nuestra plataforma simplifica el mantenimiento de tu hogar combinando tecnología inteligente con el mejor talento local.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
              <FeatureCard
                title="Diagnóstico con IA"
                description="Sube una foto o describe el problema. Nuestra inteligencia artificial te guiará para identificar la solución y el profesional adecuado."
              />
              <FeatureCard
                title="Expertos Verificados"
                description="Todos nuestros técnicos pasan por un proceso de selección, validación de credenciales y revisión de antecedentes."
              />
              <FeatureCard
                title="Fácil de Usar"
                description="Agenda visitas, aprueba presupuestos y realiza pagos de forma segura desde nuestra plataforma intuitiva, todo en un solo lugar."
              />
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}