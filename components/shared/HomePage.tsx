import HeroContent from "@/components/shared/HeroContent";
import { PageLayout } from "@/components/shared/PageLayout";
import { Container } from "@/components/shared/Container";
import { ROUTES } from "@/lib/routes";
import { AmbientGlows } from "@/components/ui/AmbientGlows";
import RoleSelectionCard from "@/components/shared/RoleSelectionCard";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { t } from "@/infrastructure/i18n/translations";

export default function HomePage() {
  return (
    <PageLayout>
      <div className="relative w-full flex-1 flex flex-col bg-[#FAF9F6] overflow-hidden -mt-20 pt-20">
        <AmbientGlows />

        <Container className="py-12 md:py-16 flex flex-col items-center gap-12 relative z-10">
          <HeroContent />

          <RoleSelectionCard
            clienteDesc={t.home.roleSelection.clienteDesc}
            clienteBtn={t.home.roleSelection.clienteBtn}
            clienteHref={ROUTES.auth.signup}
            tecnicoDesc={t.home.roleSelection.tecnicoDesc}
            tecnicoBtn={t.home.roleSelection.tecnicoBtn}
            tecnicoHref={ROUTES.auth.signup}
          />

          <div className="w-full flex flex-col items-center text-center mt-20 mb-6 relative z-10">
            <h3 className="text-3xl sm:text-[34px] font-extrabold text-brand-primary tracking-tight">
              {t.home.whyChooseUs.title}
            </h3>
            <p className="text-sm sm:text-base md:text-[17px] text-gray-500 max-w-2xl leading-relaxed mt-3.5 font-medium">
              {t.home.whyChooseUs.subtitle}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
              <FeatureCard
                title={t.home.whyChooseUs.features.aiDiagnosis.title}
                description={t.home.whyChooseUs.features.aiDiagnosis.description}
              />
              <FeatureCard
                title={t.home.whyChooseUs.features.verifiedExperts.title}
                description={t.home.whyChooseUs.features.verifiedExperts.description}
              />
              <FeatureCard
                title={t.home.whyChooseUs.features.easyToUse.title}
                description={t.home.whyChooseUs.features.easyToUse.description}
              />
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}