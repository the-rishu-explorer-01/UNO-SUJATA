import Seo from "@/components/Seo";
import Hero from "@/sections/Hero";
import TrustBar from "@/sections/TrustBar";
import CompanyIntro from "@/sections/CompanyIntro";
import ProductPreview from "@/sections/ProductPreview";
import CustomBuild from "@/sections/CustomBuild";
import IndustriesCapabilities from "@/sections/IndustriesCapabilities";
import { ManufacturingJourney, QualityPreview } from "@/sections/JourneyQuality";
import FinalCta from "@/sections/FinalCta";

export default function HomePage() {
  return (
    <>
      <Seo
        title="UNO SUJATA | Precision Brass Components Manufacturer, Jamnagar"
        description="Precision brass components for electrical, automotive, gas and industrial applications. Manufacturing since 1978 in Jamnagar, Gujarat."
        path="/"
      />
      <Hero />
      <TrustBar />
      <CompanyIntro />
      <ProductPreview />
      <CustomBuild />
      <IndustriesCapabilities />
      <ManufacturingJourney />
      <QualityPreview />
      <FinalCta />
    </>
  );
}
